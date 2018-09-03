require('dotenv').config({ silent: true });
var logger = require('./logger');
var request = require('./httpRequest');


var deviceId = "0164ea12f06e00000000000100100225";

//电表
var resourcePaths = ["/20003/1/26267", "/20003/1/26266", "/20003/1/26259", "/20003/1/26263", "/20003/1/26255", "/20003/1/26251", "/20003/1/26247", "/20003/1/26241", "/20003/1/30008", "/20003/1/30007", "/20003/1/30006", "/20003/1/30005", "/20003/1/30004", "/20003/1/30003"
					,"/20002/1/28004", "/20002/1/31002", "/20002/1/31003", "/20002/1/31004", "/20002/1/31005", "/20002/1/31006", "/20002/1/31007","/20002/3/31008"];

//控制断路器分合闸的DO模块
// var resourcePaths2 = ["/20002/1/28004", "/20002/1/31002", "/20002/1/31003", "/20002/1/31004", "/20002/1/31005", "/20002/1/31006", "/20002/1/31007"];

var MbedCloudSDK = require("./node_modules/mbed-cloud-sdk/index");
var config = require("./node_modules/mbed-cloud-sdk/examples/node/config");
var connect = new MbedCloudSDK.ConnectApi(config);

//获取连接设备列表
connect.listConnectedDevices(function(error, response) {
    if (error){
    	logger.error(error.message);
    	return;
    }

    if (response.length == 0)
    	logger.error("No Devices Found"); 
    else 
    	checkDevices(response.data);
});


//遍历设备列表检查目标设备是否存在
function checkDevices(devices){
	logger.info("devices.length " + devices.length);
	for (var i = devices.length - 1; i >= 0; i--) {
		var device = devices[i];
		if(device.id == deviceId){
			logger.info("deviceId: " + device.id + " exists.");
			// subscribe to two paths on two specific device
			connect.subscribe.resourceValues({ deviceId: [deviceId], resourcePaths: resourcePaths})
		                                      .addListener(res => logger.info(res));
		}
	}
}



                              




