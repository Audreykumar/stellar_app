var mysql=require('mysql');
 var connection=mysql.createPool({ 
host:'localhost',
 user:'root',
 password:'osm123',
 database:'stellar_db' 
});
 module.exports=connection;