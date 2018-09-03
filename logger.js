require('dotenv').config({ silent: true });
var express = require('express');
var app = express();
var logger = require('tracer').colorConsole({
    level: 'info',
    format: "{{timestamp}} <{{title}}> {{message}} (in {{file}}:{{line}})",
    dateformat: "HH:MM:ss.L"
  });

  if(process.env.mode != 'dev'){
    logger = require('tracer').dailyfile({
      root:'./log/', maxLogFiles: 10, allLogsFileName: 'web',
      level: 'info',
      format: "{{timestamp}} <{{title}}> {{message}} (in {{file}}:{{line}})",
      dateformat: "HH:MM:ss.L"
    });
    console.log('xxxxxxxxxxxxxxxxxx');
  }

  module.exports = logger;