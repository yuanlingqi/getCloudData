require('dotenv').config({ silent: true });
var logger = require('./logger');
var request = require('./httpRequest');
var http = require('http');
var MbedCloudSDK = require("mbed-cloud-sdk");
var moment = require('moment');
/*******************************************************************************************
 * DEVICE AND RESOURCE
********************************************************************************************/
// var deviceId = "0164ea12f06e00000000000100100225";
var deviceId = "0165b275783a0000000000010010008e"

/* heartbeat resource used for watchdog - ARM-CHINT*/
// var heartbeatRes = ["/3200/0/5501"];
var heartbeatRes =["/20002/3/31008"];

//电表
var resourcePaths = ["/20002/3/31008", "/20003/4/26267", "/20003/4/26266", "/20003/4/26259", "/20003/4/26263", "/20003/4/26255", "/20003/4/26251", "/20003/4/26247", "/20003/4/26241", "/20003/4/30008", "/20003/4/30007", "/20003/4/30006", "/20003/4/30005", "/20003/4/30004", "/20003/4/30003"
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
            logger.info('data:' + data);
        });  
        surlres.on("end", function () {  
            if(httpStatus == 0){
              logger.info('Network connection restored. reconnection now.--------');
              connectDevices();
              httpStatus = 1;
            }else {
              logger.info('network is ok! preHeartBeat: ' + preHeartBeat + ' curHeartBeat: ' + curHeartBeat);
              if(curHeartBeat == preHeartBeat && curHeartBeat != undefined && preHeartBeat != undefined){
                curHeartBeat = undefined;
                preHeartBeat = undefined;
                logger.info('curHeartBeat=' + curHeartBeat + ' preHeartBeat=' + preHeartBeat + '. may disconnected. reconnect now.--------' + ++exceptionTimes);
                connectDevices();
              }else if(curHeartBeat == undefined && preHeartBeat == undefined){
                logger.info('curHeartBeat=' + curHeartBeat + ' preHeartBeat=' + preHeartBeat + '. may disconnected. reconnect now.--------' + ++exceptionTimes);
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
      logger.info('network is broken.');
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
  logger.info('timerId:----------' + sid);
}
/*******************************************************************************************
 * MBED CLOUD SDK INIT
********************************************************************************************/
var ApiKey_ArmTZ = "ak_1MDE1ODc3OTAzOGI0MDI0MjBhMDE0YzExMDAwMDAwMDA015d725ade7e02420a010d0600000000aGO6EmcXj7VWBymaYUBQCGfdM62CChWw";
var ApiKey_Chint = "ak_1MDE2MjI5NGJkOTU3MGE1ODBhMDEyNDI4MDAwMDAwMDA016588cddef25207809e0373000000002wUtterIo04qC3x2vpTd9yuvqmhA7Rb9";
var Host_ArmUS  = "https://api.us-east-1.mbedcloud.com"

/* CHINT-ARM */
//var accessKey = process.env.MBED_CLOUD_API_KEY || ApiKey_Chint;
var accessKey = process.env.MBED_CLOUD_API_KEY || ApiKey_Chint;
var apiHost = process.env.MBED_CLOUD_HOST || Host_ArmUS;

var config = {
	apiKey: accessKey,
	host: apiHost
};

var connect = new MbedCloudSDK.ConnectApi(config);
var deviceName;
var connected = 0;
/*******************************************************************************************
 * FUNTIONS
********************************************************************************************/
// List Connected Devices
function listDevices() {
    logger.info("----List Connected Devices ---- >");
    return connect.listConnectedDevices()
    .then(response => {
        //logger.info(response);
        response.data.forEach(device => {
            // logger.info('-------' + device.id);
            if (device.id == deviceId) {
                deviceName =  device.serialNumber;
                connected = 1;
                /*Subscribe all resources need to monitor  */
                subscribeRes();
                /*Start the watchdog to handle hungup issues */
                startWatchDog();
                logger.info(device.serialNumber);
            }
        });
        
    })
    .catch(error => {
        logger.info(`\t└\x1b[0m: Error: ${error.message}`);
    });
}

var preValueStr;
var curValueStr;
/*Subscribe all relevant resouces from all devices */
function subscribeRes(){
    logger.info("----Subscribe the resources ---->");
    /*Subscribe the resources */
    connect.subscribe.resourceValues({resourcePaths: resourcePaths}, "OnValueUpdate")
        .addListener(res => {
                if(res.path == '/20002/3/31008'){
                    logger.info('heartbeatRes:' + res.payload);
                    curHeartBeat = res.payload;
                }else{
                    logger.info(res.path + ':' + res.payload);
                    curValueStr = res.deviceId + res.path + res.payload;
                    //避免传递重复数据
                    if (curValueStr != preValueStr) {
                        request(res.deviceId, res.path, res.payload, timeNow(),deviceName, connected);
                        preValueStr = curValueStr;
                    }
                }
            })
        .addLocalFilter(res => res.contentType != undefined);

    /*Subscribe the heartbeat resource */
    // connect.subscribe.resourceValues({ resourcePaths: heartbeatRes })
    //     .addListener(res => {
    //         logger.info('heartbeatRes:' + res.payload);
    //         curHeartBeat = res.payload;
    //     });
}

function recoverSubscribeRes(){
    /* Stop the Interval */
    clearInterval(watchdogInterval);
    connected = 0;
    /* Remove all subscriptions and presubscriptions */
    connect.deleteSubscriptions()
    .catch(error => {
        logger.info(error);
    });
    connect.deletePresubscriptions()
    .catch(error => {
        logger.info(error);
    });

    /* Redo the subscription and watchdog  */
    listDevices();
    // subscribeRes();
    // startWatchDog();
}


function checkHeartbeat(){
    logger.info('[checkHeartbeat]' + 'curHeartBeat=' + curHeartBeat + ' preHeartBeat=' + preHeartBeat);
    if(curHeartBeat == preHeartBeat){
        logger.info('[checkHeartbeat]The heartbeat stopped for ' + timeoutHeartbeat + ' seconds, need to reset!!');
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
            logger.info('data:' + data);
        });  
        surlres.on("end", function () {  
            if(httpStatus == 0){
              logger.info('Network connection restored. reconnection now.--------');
              recoverSubscribeRes();
              httpStatus = 1;
            }else {
              logger.info('network is ok!');
            }
        });  
    }).on("error", function (error) {  
      //网络异常
      httpStatus = 0;
      logger.error(error);
      logger.info('network is broken.');
    }); 
}

/* Check heartbeat resource every "timeout_heartbeat", if the value did not changed, recover*/
var timeoutHeartbeat = 35;
/* Watchdog for Subscription */
var watchdogInterval;

function startWatchDog(){
    curHeartBeat = 0;
    preHeartBeat = 0;
    watchdogInterval = setInterval(function(){
        checkHeartbeat();
        // checkNetwork();
    }, timeoutHeartbeat*1000);
}

/*******************************************************************************************
 * APP START
********************************************************************************************/
function mainApp(){
    /*Just print out all connected devices, not really need */
    listDevices();
    /*Subscribe all resources need to monitor  */
    // subscribeRes();
    /*Start the watchdog to handle hungup issues */
    // startWatchDog();
}

/* No webhook, run on local machine ARM-CHINT */
// mainApp();

/* Webhook, run on AWS instance ARM-CHINT*/
/** The url is the full url address of server */

var url = "http://ec2-52-83-186-68.cn-northwest-1.compute.amazonaws.com.cn:8080";
connect.getWebhook()
    .then(webhook => {
        if (webhook) {
            if (webhook.url === url) {
                logger.info(`Webhook already set to ${url}`);
                return;
            } else {
                logger.info(`Webhook currently set to ${webhook.url}, changing to ${url}`);
            }
        } else {
            logger.info(`No webhook currently registered, setting to ${url}`);
        }

        return connect.updateWebhook(url);
    })
    .then(() => {
        mainApp();
    })
    .catch(error => {
        logger.info(`${error.message} - Unable to set webhook to ${url}, please ensure the URL is publicly accessible`);
        process.exit();
    });