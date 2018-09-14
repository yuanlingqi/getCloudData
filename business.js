require('dotenv').config({ silent: true });
var logger = require('./logger');
var request = require('./httpRequest');
var http = require('http');
var fs = require("fs");
var MbedCloudSDK = require("mbed-cloud-sdk");

/** Install EXPRESS server */
try {
    var express = require("express");
} catch(e) {}

if (!express) {
    console.log("This example requires the 'express' server. Please install it by running 'npm install express'");
    process.exit();
}
var app = express();

/*******************************************************************************************
 * DEVICE AND RESOURCE
********************************************************************************************/
var deviceId = "0164ea12f06e00000000000100100225";
// var deviceId = "0165b275783a0000000000010010008e"

/* heartbeat resource used for watchdog - ARM-CHINT*/

// var heartbeatRes = ["/3200/0/5501"];
// var heartbeatRes =["/20002/3/31008"];

//电表
var resourcePaths = ["/3200/0/5501", "/20002/3/31008", "/20003/4/26267", "/20003/4/26266", "/20003/4/26259", "/20003/4/26263", "/20003/4/26255", "/20003/4/26251", "/20003/4/26247", "/20003/4/26241", "/20003/4/30008", "/20003/4/30007", "/20003/4/30006", "/20003/4/30005", "/20003/4/30004", "/20003/4/30003"
                ,"/20002/3/28004", "/20002/3/31002", "/20002/3/31003", "/20002/3/31004", "/20002/3/31005", "/20002/3/31006", "/20002/3/31007", "/20003/4/26241"];

//控制断路器分合闸的DO模块
// var resourcePaths2 = ["/20002/1/28004", "/20002/1/31002", "/20002/1/31003", "/20002/1/31004", "/20002/1/31005", "/20002/1/31006", "/20002/1/31007"];

/*******************************************************************************************
 * EXCEPTION RECOVERY - TBD
********************************************************************************************/
//异常恢复
var httpStatus = 1;
var timer;
var duration = process.env.SCHEDULE_DURATION || 60;
var exceptionTimes = 0;
function startSchedule(){
  timer = setInterval(function(){
    var surlreq = http.get("http://www.163.com", function (surlres) {  
        surlres.on("data", function (data) { 
            console.log('data:' + data);
        });  
        surlres.on("end", function () {  
            if(httpStatus == 0){
              console.log('Network connection restored. reconnection now.--------');
              connectDevices();
              httpStatus = 1;
            }else {
              console.log('network is ok! preHeartBeat: ' + preHeartBeat + ' curHeartBeat: ' + curHeartBeat);
              if(curHeartBeat == preHeartBeat && curHeartBeat != undefined && preHeartBeat != undefined){
                curHeartBeat = undefined;
                preHeartBeat = undefined;
                console.log('curHeartBeat=' + curHeartBeat + ' preHeartBeat=' + preHeartBeat + '. may disconnected. reconnect now.--------' + ++exceptionTimes);
                connectDevices();
              }else if(curHeartBeat == undefined && preHeartBeat == undefined){
                console.log('curHeartBeat=' + curHeartBeat + ' preHeartBeat=' + preHeartBeat + '. may disconnected. reconnect now.--------' + ++exceptionTimes);
                connectDevices();
              }else{
                preHeartBeat = curHeartBeat;
              }
            }
        });  
    }).on("error", function (error) {  
      //网络异常
      httpStatus = 0;
      logger.error(error);
      console.log('network is broken.');
    });  
  },duration * 1000);

  //避免JSON循环引用
  var cache = [];
  var sid = JSON.stringify(timer, function(key, value) {
    if (typeof value === 'object' && value !== null) {
        if (cache.indexOf(value) !== -1) {
            // Circular reference found, discard key
            return;
        }
        // Store value in our collection
        cache.push(value);
    }
    return value;
  });
  cache = null; // Enable garbage collection
  console.log('timerId:----------' + sid);
}
/*******************************************************************************************
 * MBED CLOUD SDK INIT
********************************************************************************************/
var ApiKey_ArmTZ = "ak_1MDE1ODc3OTAzOGI0MDI0MjBhMDE0YzExMDAwMDAwMDA015d725ade7e02420a010d0600000000aGO6EmcXj7VWBymaYUBQCGfdM62CChWw";
var ApiKey_Chint_Jianbing = "ak_1MDE2MjI5NGJkOTU3MGE1ODBhMDEyNDI4MDAwMDAwMDA016588cddef25207809e0373000000002wUtterIo04qC3x2vpTd9yuvqmhA7Rb9";
var ApiKey_Chint1 = "ak_1MDE2MjI5NGJkOTU3MGE1ODBhMDEyNDI4MDAwMDAwMDA016541f550d08669b5e804f500000000GOAaqJeIacOJuYQXCkKIN3OujXenUHmR";
var ApiKey_Chint2 = "ak_1MDE2MjI5NGJkOTU3MGE1ODBhMDEyNDI4MDAwMDAwMDA0164a19f606292ac79f9389200000000J7YIJkOM8p2saqHsNXQqrav8G4h9LWbS";

var Host_ArmUS  = "https://api.us-east-1.mbedcloud.com"

/* CHINT-ARM */
//var accessKey = process.env.MBED_CLOUD_API_KEY || ApiKey_ArmTZ;
var accessKey = process.env.MBED_CLOUD_API_KEY || ApiKey_Chint_Jianbing;
var apiHost = process.env.MBED_CLOUD_HOST || Host_ArmUS;

var config = {
	apiKey: accessKey,
	host: apiHost
};

var connect = new MbedCloudSDK.ConnectApi(config);

/*******************************************************************************************
 * FUNTIONS
********************************************************************************************/
// List Connected Devices
function listDevices() {
    console.log("----List Connected Devices ---- >");
    return connect.listConnectedDevices()
    .then(response => {
        //console.log(response);
        response.data.forEach(device => {
            console.log(`Device: ${device.id}`);
        });
        
    })
    .catch(error => {
        console.log(`\t└\x1b[0m: Error: ${error.message}`);
    });
}

var preValueStr;
var curValueStr;
var ResObserver;

/*Subscribe all relevant resouces from all devices */
function subscribeRes(){
    console.log("----Subscribe the resources ---->");
    /*Subscribe the resources */
    ResObserver = connect.subscribe.resourceValues({deviceId: deviceId, resourcePaths: resourcePaths}, "OnValueUpdate")
        .addListener(res => {
                console.log(res);
                if(res.path == '/20002/3/31008'){
                    console.log('heartbeatRes:' + res.payload);
                    curHeartBeat = res.payload;
                }else{
                    console.log(res.path + ':' + res.payload);
                    curValueStr = res.deviceId + res.path + res.payload;
                    //避免传递重复数据
                    if (curValueStr != preValueStr) {
                        request(res.deviceId, res.path, res.payload, timeNow());
                        preValueStr = curValueStr;
                    }
                }
            })
        //.addLocalFilter(res => res.contentType != undefined);

    /*Subscribe the heartbeat resource */
    // connect.subscribe.resourceValues({ resourcePaths: heartbeatRes })
    //     .addListener(res => {
    //         console.log('heartbeatRes:' + res.payload);
    //         curHeartBeat = res.payload;
    //     });
}

function recoverSubscribeRes(){
    /* Stop the Interval */
    clearInterval(watchdogInterval);
    /* Stop this observer receiving notifications from the channel */
    ResObserver.unsubscribe();

    /* Remove all subscriptions and presubscriptions */
    connect.deleteSubscriptions()
    .catch(error => {
        console.log(error);
    });
    connect.deletePresubscriptions()
    .catch(error => {
        console.log(error);
    });
    /* Redo the subscription and watchdog  */
    subscribeRes();
    startWatchDog();
}

function checkHeartbeat(){
    console.log('[checkHeartbeat]' + 'curHeartBeat=' + curHeartBeat + ' preHeartBeat=' + preHeartBeat);
    if(curHeartBeat == preHeartBeat){
        console.log('[checkHeartbeat]The heartbeat stopped for ' + timeoutHeartbeat + ' seconds, need to reset!!');
        recoverSubscribeRes();
    }else{
        preHeartBeat = curHeartBeat;
    }

}

function timeNow(){
  var timeStr = moment();
  var timeStr= timeStr.format('YYYY-MM-DD HH:mm:ss');
  return timeStr;
}

function checkNetwork(){
    var surlreq = http.get("http://www.163.com", function (surlres) {  
        surlres.on("data", function (data) { 
            console.log('data:' + data);
        });  
        surlres.on("end", function () {  
            if(httpStatus == 0){
              console.log('Network connection restored. reconnection now.--------');
              recoverSubscribeRes();
              httpStatus = 1;
            }else {
              console.log('network is ok!');
            }
        });  
    }).on("error", function (error) {  
      //网络异常
      httpStatus = 0;
      logger.error(error);
      console.log('network is broken.');
    }); 
}

/* Check heartbeat resource every "timeout_heartbeat", if the value did not changed, recover*/
var timeoutHeartbeat = 35;
/* Watchdog for Subscription */
var watchdogInterval;

function startWatchDog(){
    curHeartBeat = 0;
    preHeartBeat = 0;
    watchdogInterval = setInterval(function(){checkHeartbeat()}, timeoutHeartbeat*1000);
}

/*******************************************************************************************
 * APP START
********************************************************************************************/
function mainApp(){
    /*Just print out all connected devices, not really need */
    listDevices();
    /*Subscribe all resources need to monitor  */
    subscribeRes();
    /*Start the watchdog to handle hungup issues */
    startWatchDog();
}

/* No webhook, run on local machine ARM-CHINT */
//mainApp();

/* Webhook, run on AWS instance ARM-CHINT*/
/** The url is the full url address of server */
var url = "http://ec2-52-83-186-68.cn-northwest-1.compute.amazonaws.com.cn:8080/check";
var port = 9000;
// Listen for PUTs at the root URL
app.put("/check", (req, res, next) => {

    var data = "";
    req.on("data", chunk => {
        console.log('data--1--' + data);
        data += chunk;
    });

    req.on("end", () => {
        console.log('data--2--' + data);
        // Parse data into JSON and inject into connect notification system
        data = JSON.parse(data);
        connect.notify(data);
    });
    console.log('data---3-' + data);
    res.sendStatus(200);
});

// Start server
http.createServer(app).listen(port, () => {
    console.log(`Webhook server listening on port ${port}`);
});

connect.getWebhook()
    .then(webhook => {
        if (webhook) {
            if (webhook.url === url) {
                console.log(`Webhook already set to ${url}`);
                return;
            } else {
                console.log(`Webhook currently set to ${webhook.url}, changing to ${url}`);
            }
        } else {
            console.log(`No webhook currently registered, setting to ${url}`);
        }
        connect.deleteWebhook();
        console.log('Always delete existing webhook first');    
        return connect.updateWebhook(url);
    })
    .then(() => {
        mainApp();
    })
    .catch(error => {
        console.log(`${error.message} - Unable to set webhook to ${url}, please ensure the URL is publicly accessible`);
        process.exit();
    });
