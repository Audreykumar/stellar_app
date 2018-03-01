// user model
var db=require('../app/dbConnection'); //reference of dbconnection.js
var User={
 
getAllUsers:function(callback){
	return db.query("select * from users",callback);
	db.release();	
},
//  getContractById:function(id,callback){
 
// return db.query("select * from contract where id=?",[id],callback);
//  },
 addUser:function(User,callback){ 	
 	var date = new Date();
 return db.query("Insert into users(name,email,encrypted_password,created_at,updated_at) values(?,?,?,?,?)",[User.name,User.email,User.password,date,date],callback);
 	db.release();
 },
 checkUser:function(email,callback){ 	
  return db.query("select users.*,user_network_picker.id as network_id,user_network_picker.network, user_network_picker.network_url from users left join user_network_picker on user_network_picker.user_id = users.id where email=?",[email],callback);
  		db.release();
 },
 setUserNetwork : function(User,callback){
 	dateTime = require('date-time');
 	return db.query("INSERT INTO user_network_picker (network,network_url, user_id,created_at,updated_at) values('"+User.network+"', '"+User.network_url+"', '"+User.user_id+"', '"+dateTime()+"','"+dateTime()+"') ON DUPLICATE KEY UPDATE network='"+User.network+"',network_url='"+User.network_url+"', updated_at='"+dateTime()+"'",callback);
 	db.release(); 	 
 }
 
};
 module.exports=User;