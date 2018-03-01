// Transaction model
var db=require('../app/dbConnection'); //reference of dbconnection.js
var Transactions={
 	getAllTransactions:function(user_id,callback){
	return db.query("select * from transactions where user_id=?",[user_id],callback);	
	db.release();
	},
 	addPayment:function(Transactions,callback){ 	
	 	var date = new Date();
	 	return db.query("Insert into transactions(type,user_id,sender_id,reciever_id,amount,memo,result,created_at,updated_at) values(?,?,?,?,?,?,?,?,?)",[Transactions.type,Transactions.user_id,Transactions.sender_id,Transactions.reciever_id,Transactions.amount,Transactions.memo,Transactions.result,date,date],callback);
	 	db.release();
	}
 };
module.exports=Transactions;