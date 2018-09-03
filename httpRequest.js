var http=require('http');  
const querystring = require("querystring");
var logger = require('./logger');

module.exports = function(uuid, resourceId, value, createTime){
    // var queryString = 'http://54.222.168.82:8085/ChintEdge/send?';
    // var params = 'id=' + uuid + '&resourceId=' + querystring.escape(resourceId) + '&value=' + value + '&createTime=' + querystring.escape(createTime);
    // logger.info('queryString=' +queryString + params);
    // queryString = queryString + params;
    // // logger.info('queryString=' +queryString);
    // // logger.info('queryString=' +querystring.unescape(queryString));
    // //get 请求外网  
    // http.get(queryString,function(req,res){  
    //     logger.info('开始请求----');
    //     var html='';  
    //     req.on('data',function(data){  
    //         html+=data;  
    //         logger.info('请求返回----' + data);
    //     });  
    //     req.on('end',function(){  
    //         logger.info(html + '请求结束----'); 
    //     });  
    //     req.on('error',function(error){  
    //         logger.error('error---:' + error); 
    //     });  
    // });

    var data = {  
        id: uuid,
        resourceId: resourceId,
        value: value,
        createTime: createTime
    };
    
    var content = querystring.stringify(data); 
      
    var options = {  
        hostname: '54.222.168.82',  
        port: 8085,  
        path: '/ChintEdge/data/send?' + content,  
        method: 'GET'  
    };  
      

    // console.log('options: ' + JSON.stringify(options));
    var req = http.request(options, function (res) {  
        // logger.info('STATUS: ' + res.statusCode);  
        // logger.info('HEADERS: ' + JSON.stringify(res.headers));  
        res.setEncoding('utf8');  
        res.on('data', function (chunk) {  
            // logger.info('BODY: ' + chunk);  
        });
        res.on('error', function (error) {  
            logger.error('error--: ' + error);  
        });  
    });  
      
    req.on('error', function (e) {  
        logger.error('problem with request: ' + e.message);  
    });  
      
    req.end();  
};


