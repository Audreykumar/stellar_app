// Accounts model
var db=require('../app/dbConnection'); //reference of dbconnection.js
var Account={ 
	getAllAccounts:function(user_id,callback){
		return db.query("select * from accounts where user_id="+user_id,callback);			
		db.release();
	},
	getAllAccountAssets:function(user_id, callback) {
		// body...
		return db.query("select accounts.*,assets.asset_code,assets.id as asset_id from accounts left join assets on assets.asset_issuer = accounts.id where accounts.user_id="+user_id,callback);
		db.release();
	},
	getDefaultAccount:function(user_id,callback){
		return db.query("select accounts.*,user_default_accounts.id as default_id from accounts left join user_default_accounts on user_default_accounts.account_id=accounts.id where user_default_accounts.user_id =?",[user_id],callback);
		db.release();
	},
	defaultAccount:function(Accounts,callback){		
		dateTime = require('date-time');
		return db.query("INSERT INTO user_default_accounts (account_id, user_id,created_at,updated_at) values('"+Accounts.account_id+"', '"+Accounts.user_id+"', '"+dateTime()+"','"+dateTime()+"') ON DUPLICATE KEY UPDATE account_id="+Accounts.account_id+", updated_at='"+dateTime()+"'",callback);
		db.release();
	},
	 addAccount:function(Accounts,callback){ 	
	 	var date = new Date();
	 return db.query("Insert into accounts(user_id,name,address,private_key,public_key,created_at,updated_at) values(?,?,?,?,?,?,?)",[Accounts.user_id,Accounts.name,Accounts.address,Accounts.private_key,Accounts.public_key,date,date],callback);
	 db.release();
	 },
	 checkUser:function(email,callback){ 	
	  return db.query("select * from users where email=?",[email],callback);
	  db.release();
	 } 
};
 module.exports=Account;