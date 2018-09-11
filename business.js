require('dotenv').config({ silent: true });
var logger = require('./logger');
var request = require('./httpRequest');
var http = require('http');
var deviceId = "0164ea12f06e00000000000100100225";
// var deviceId = "0165b275783a0000000000010010008e"
//电表
var resourcePaths = ["/20003/1/26267", "/20003/1/26266", "/20003/1/26259", "/20003/1/26263", "/20003/1/26255", "/20003/1/26251", "/20003/1/26247", "/20003/1/26241", "/20003/1/30008", "/20003/1/30007", "/20003/1/30006", "/20003/1/30005", "/20003/1/30004", "/20003/1/30003"
                ,"/20002/1/28004", "/20002/1/31002", "/20002/1/31003", "/20002/1/31004", "/20002/1/31005", "/20002/1/31006", "/20002/1/31007","/20002/3/31008", "/20003/4/26241"];

//控制断路器分合闸的DO模块
// var resourcePaths2 = ["/20002/1/28004", "/20002/1/31002", "/20002/1/31003", "/20002/1/31004", "/20002/1/31005", "/20002/1/31006", "/20002/1/31007"];






//异常恢复
var httpStatus = 1;
var preHeartBeat;
var curHeartBeat;
var timer;
var duration = process.env.SCHEDULE_DURATION || 60;
function startSchedule(){
  var exceptionTimes = 0;
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

var MbedCloudSDK = require("./node_modules/mbed-cloud-sdk/index");
var config = require("./node_modules/mbed-cloud-sdk/examples/node/config");
var connect = new MbedCloudSDK.ConnectApi(config);

connectDevices();

//获取连接设备列表
function connectDevices(){
    connect.listConnectedDevices(function(error, response) {
        console.log("List Connected Devices - >");
        if (error){
            logger.error(error.message);
            return;
        }

        if (response.length == 0)
            logger.error("No Devices Found"); 
        else {
            /*No need to check device but just subscribe the relevant resouces */
            subscribeRes();
        }
    });
}

/*Subscribe all relevant resouces from all devices */
function subscribeRes(){
    console.log("Subscribe the Resource - >");
    connect.removeAllListeners("OnValueUpdate");
    connect.subscribe.resourceValues({resourcePaths: resourcePaths}, "OnValueUpdate")
            .addListener(res => 
                {
                    logger.info(res);
                    if (res.path == '/20002/3/31008') {
                        curHeartBeat = res.payload;
                    }
                })
            .addLocalFilter(res => res.contentType != undefined);
    clearInterval(timer);
    startSchedule();
}


