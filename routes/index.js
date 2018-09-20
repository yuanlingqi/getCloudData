var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});


router.get("/getD01", (req, res, next) => {
    console.log('xxxxxxxxxxxxxxxxxxxdeeeee1');
    var resourceURI = req.query.resourceId;  
    console.log("resourceId value is " + resourceURI);
    res.end(111); 


    res.on('error', function (error) {  
        console.error('error--: ' + error); 
        res.end("-1"); 
    });  
   
    res.sendStatus(200);
});

module.exports = router;
