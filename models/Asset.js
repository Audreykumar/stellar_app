var db=require('../app/dbConnection'); //reference of dbconnection.js
var Assets={

getAllAssets:function(user_id,callback){
	return db.query("select assets.*,accounts.id as account_id, accounts.public_key as issuer from assets left join accounts on accounts.id = assets.asset_issuer where assets.user_id=?",[user_id],callback);
	db.release();
},
addAssets:function(Assets,callback){ 	
 	
 	dateTime = require('date-time');
 return db.query("Insert into assets(asset_name,asset_description,asset_image_url,asset_code,asset_issuer,asset_reciever,asset_limit,user_id,transaction_id,status,created_at,updated_at) values(?,?,?,?,?,?,?,?,?,?,?,?)",[Assets.asset_name,Assets.asset_description,Assets.asset_image_url,Assets.asset_code,Assets.asset_issuer,Assets.asset_reciever,Assets.asset_limit,Assets.user_id,Assets.transaction_id,Assets.status,dateTime(),dateTime()],callback);
 db.release();
 }

};
 module.exports=Assets;