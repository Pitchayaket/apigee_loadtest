import http from "k6/http";
import {check} from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";


let oauth;
let requestDate;
let requestRef;
let transmitDateTime;
let partnerJWTToken;

//capco cloud = https://35.201.74.165.nip.io
//BBL SIT, UAT = https://api-sit.test.bbl:6999
const env = "https://api-sit.test.bbl:6999" 

var today = new Date(); 
  
  // Get the day of the month
  var dd = today.getDate();

  // Get the month (adding 1 because months are zero-based)
  var mm = today.getMonth() + 1;

  // Get the year
  var yyyy = today.getFullYear();

// Add leading zero if the day is less than 10
if (dd < 10) {
    dd = '0' + dd;
}; 

// Add leading zero if the month is less than 10
if (mm < 10) {
    mm = '0' + mm;
};
var HH = today.getUTCHours();
var minutes = today.getUTCMinutes();
var ss = today.getUTCSeconds();

if (HH < 10) {
  HH = '0' + HH;
}
if (minutes < 10) {
  minutes = '0' + minutes;
}
if (ss < 10) {
  ss = '0' + ss;
}

requestDate = "2024-01-12";
transmitDateTime = requestDate + 'T'+ `${HH}`+ ':' + `${minutes}` + ':' + `${ss}` +'.855+07:00';

let body = {
    billerId: '010753600037453',
    destBank: '002',
    transRef: '2024010311021623000858008',
    reference1: '1112221112',
    reference2 : '0011',
    amount: '0.99'
};

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.01'],//http errors should be less than 1%
    http_req_duration: ["p(95)<1000"],//95% of requests should be below 1000ms
  },
  insecureSkipTLSVerify: true,
  vus: 1,
  duration: "5s",
};

export function create_Oauth(){
    var client_id = "V1j6we9FTAbKxnGcTXWJe6VaS2QGWbxv";
    var secret = "fm6GNzyKyWfsyz9t";
    var scope = "CREATE READ";
    var data =
      "grant_type=client_credentials&client_id=" +
      client_id +
      "&client_secret=" +
      secret +
      "&scope=" +
      scope;
  
    var tokenResponse = http.post(
      `${env}/oauth/accesstoken`,
      data,
      { headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic VjFqNndlOUZUQWJLeG5HY1RYV0plNlZhUzJRR1dieHY6Zm02R056eUt5V2ZzeXo5dA=='
        }
      }
    );
    var result = JSON.parse(tokenResponse.body);
    let token = result.accessToken;
    //console.log(token);
    return {token};
  }

  export function genJWT_partnertoken() {
  
    var tokenResponse = http.post(
      `${env}/jwt/partner`,
      JSON.stringify(body),
      { headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${oauth}`
        }
      }
    );
    var result = JSON.parse(tokenResponse.body);
    var partnertoken = result.signature;
    return {partnertoken};
}

export default function(){
  
oauth = (create_Oauth().token);
requestRef = "2024010311021623000858008";
partnerJWTToken = (genJWT_partnertoken().partnertoken);
//console.log("partnerJWTToken is: " + partnerJWTToken);
    var pullPayment_Response = http.post(
      `${env}/biller/v1/pull-payment`,
      JSON.stringify(body),
      { headers: {
        'Signature': `${partnerJWTToken}`,
        'Transmit-Date-Time': `${transmitDateTime}`,
        'Request-Ref': `${requestRef}`,
        'Origin': "http://something.com",
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${oauth}`
        }
      }
    );
    var result = JSON.parse(pullPayment_Response.body);
    //console.log("---------------response is:      " + result.status.code);
    check(pullPayment_Response, {
      'is status 200': (r) => r.status === 200,
    });
   // return {res};
}

export function handleSummary(data) {
  return {
    "summary_apigee_pullPayment.html": htmlReport(data),
  };
}