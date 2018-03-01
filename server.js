// dependencies
var express = require('express');
var path = require("path");
var fs = require("fs");
var morgan = require('morgan');
var validator = require('express-validator');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var flash = require('connect-flash');
var bodyParser = require('body-parser');
var csrf = require('csurf');
var helmet = require('helmet');
var expressLayouts = require('express-ejs-layouts');
// setup route middlewares
var csrfProtection = csrf({ cookie: true });
var parseForm = bodyParser.urlencoded({ extended: false });

// create express app
var app = express();

app.use(validator());
app.use(helmet());
// parse cookies
// we need this because "cookie" is true in csrfProtection
app.use(cookieParser());
// app.use(session({secret:'max!123@1cap',cookie: {maxAge: new Date(Date.now() + (60 * 1000 * 1))},resave: false,saveUninitialized: false }));
app.use(session({secret:'max!123@1cap',resave: false,saveUninitialized: false }));
app.use(flash());
app.use('/node_modules',express.static(__dirname + '/node_modules'));
// ================================================================
// setup our express application
// ================================================================
app.use('/public', express.static(process.cwd() + '/public'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set("views",path.join(__dirname, '/views'));

// create a write stream (in append mode)
var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {flags: 'a'})
 
// setup the logger
app.use(morgan('combined', {stream: accessLogStream}));

// app.use(function(req, res, next){
// 	res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
//     // if there's a flash message in the session request, make it available in the response, then delete it
//     res.locals.sessionFlash = req.session.sessionFlash;    
//     delete req.session.sessionFlash;
//     next();
// });
var routes = require('./app/routes.js');
routes(app, parseForm, csrfProtection);

app.use(function (err, req, res, next) {
  if (err.code !== 'EBADCSRFTOKEN') return next(err)

  // handle CSRF token errors here
	req.flash("danger","Authentication failed");
  res.status(403)
  res.redirect(301,req.headers.referer);
});

// start our server
// ================================================================
var server = app.listen(8585, function () {
   var host = server.address().address
   var port = server.address().port
   
   console.log("Stellar app listening at http://%s:%s", host, port)
})