const express = require('express');
const cors = require('cors');
const winston = require('winston');

const logger = new ( winston.Logger ) (
  {
    transports: [
      new (winston.transports.Console) ()
    ]
  }
);

const bodyParser = require('body-parser');

const axios = require('axios');
const etag = require('etag');

const app = express();

app.use(cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let logOrigin = function( req, res, next ) {
  logger.log('info', '%s Origin:%s, URL:%s ', new Date() , req.headers.origin, req.url );
  next();
};

app.use(logOrigin);



app.post('/api/laterals', function(req, res) {

  let baseUrl = process.env.APIBASE;
  let api = '/abb-v-sites';
  let url = baseUrl + api;
  let apikey = process.env.APIKEY;

  axios
    .get(url, {
      headers: { "x-cdata-authtoken": apikey }
    })
    .then(response => {
      // Trim site names.
      let sites = response.data.value.map( site => {
        return { "SiteName": site.SiteName.trim() }
      });

      let results = {"value": sites };
      let ETagVal = etag(JSON.stringify( sites ));

      res.setHeader('ETag', ETagVal );
      res.send(results);
    })
    .catch(err => {
      console.log(err);
    });

});

app.post('/api/login', function(req, res) {

  let user = req.body.UserName;
  let pass = req.body.UserPass;

  let baseUrl = process.env.APIBASE;
  let api = 'wp-sp-authorize';
  let url = baseUrl + api;
  let apikey = process.env.APIKEY;

  axios
    .post(url, {
      UserName: user,
      UserPass: pass,
      App: 'ABB Log'
    }, {
      headers: { "x-cdata-authtoken": apikey }
    })
    .then(response => {
      let data = response.data.value;
      let obj = data[0];

      let results = {"value": obj.result  };

      res.send(results);
    })
    .catch(err => {
      console.log(err);
    });
});

app.post('/api/lateral', function(req, res) {

  function revA2D(x) {
    let result = '';
    switch (x.substr(0, 1)) {
      case 'A':
        result = '4';
        break;
      case 'B':
        result = '3';
        break;
      case 'C':
        result = '2';
        break;
      case 'D':
        result = '1';
        break;
      default:
        result = '0';
        break;
    }
    return result;
  }

  let SiteName = req.body.SiteName ;
  let Days = req.body.Days;
  let Type = req.body.Type;

  let baseUrl = process.env.APIBASE;
  let api = '/abb-sp-30DaySiteReadings';
  let url = baseUrl + api;
  let apikey = process.env.APIKEY;

  axios
    .post(url, {
      'SiteName': SiteName,
      'CSV': 'No',
      'Days': Days,
      'Type': Type
    }, {
      headers: { "x-cdata-authtoken": apikey }
    })
    .then(response => {
      let data = response.data.value.sort(function (a, b) {
        let akey = a.readingdate + a.readingtime + revA2D(a.chname) + a.chname;
        let bkey = b.readingdate + b.readingtime + revA2D(b.chname) + b.chname;

        if (akey < bkey) {
          return 1;
        } else if (akey > bkey) {
          return -1;
        } else {
          return 0;
        }
      });
      // Update row numbers
      for ( let i=0; i<data.length; i++ ) {
        data[i].row = i+1;
      }
      let results = {"value": data };
      res.send(results);
    })
    .catch(err => {
      console.log(err);
    });
});

const port = process.env.PORT;
console.log('Server Running on Port: ' + port.toString() );
app.listen(port, () => `Server running on port ${port}`);