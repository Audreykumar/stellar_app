module.exports = function(app, parseForm, csrfProtection) {
	function isLoggedIn (req, res, next) {	
	  if (!(req.session.user)) {
	    // return res.send('Not logged in!');	    
		 req.flash('danger',"Please login, before checking dashboard")
			return res.redirect(301, '/sign-in');
	  }
	  else
	  {
	  	next();
	  }
	  
	}
	function getAsset(asset_code, callback)
	{
		var request = require('request');
			request('https://horizon-testnet.stellar.org/assets?asset_code='+asset_code, function (error, response, body) {
			  if (!error && response.statusCode == 200) {
			  	console.log(body)
			    resolve(body);			    
			  }
			  else {
			    console.log("Error "+response.statusCode)
			  }
			})

			
	}
	function getBallance(public_key)
	{		
	console.log("balances here "+balances);
	return balances;
	}

	function checkDefaultAccount (req, res, next) {	
		if (!(req.session.user)) {
	  return req.session.sessionFlash = {
		        type: 'warning',
		        message: "Please setup your default recieving account here."
		    }
		}
		else
		{
		    next();
		}
	  
	}
	function sendTransaction(req,res,sender,destinationId,sender_id,reciever_id,type,amount,memo) {
			var StellarSdk = require('stellar-sdk');
			StellarSdk.Network.useTestNetwork();
			var server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
			var sourceKeys = StellarSdk.Keypair.fromSecret(sender);
				// Transaction will hold a built transaction we can resubmit if the result is unknown.
			var transaction;

			// First, check to make sure that the destination account exists.
			// You could skip this, but if the account does not exist, you will be charged
			// the transaction fee when the transaction fails.
			server.loadAccount(destinationId)
			  // If the account is not found, surface a nicer error message for logging.
			  .catch(StellarSdk.NotFoundError, function (error) {
			    throw new Error('The destination account does not exist!');
			  })
			  // If there was no error, load up-to-date information on your account.
			  .then(function() {
			    return server.loadAccount(sourceKeys.publicKey());
			  })
			  .then(function(sourceAccount) {
			    // Start building the transaction.
			    transaction = new StellarSdk.TransactionBuilder(sourceAccount)
			      .addOperation(StellarSdk.Operation.payment({
			        destination: destinationId,
			        // Because Stellar allows transaction in many currencies, you must
			        // specify the asset type. The special "native" asset represents Lumens.
			        asset: StellarSdk.Asset.native(),
			        amount: amount
			      }))
			      // A memo allows you to add your own metadata to a transaction. It's
			      // optional and does not affect how Stellar treats the transaction.
			      .addMemo(StellarSdk.Memo.text(memo))
			      .build();
			    // Sign the transaction to prove you are actually the person sending it.
			    transaction.sign(sourceKeys);
			    // And finally, send it off to Stellar!
			    return server.submitTransaction(transaction);
			  })
			  .then(function(result) {
			    console.log('Success! Results:', result);

				//save to db
				var db_transaction= require("../models/Transactions");
				db_transaction.addPayment({user_id:req.session.user.id,sender_id:sender_id,reciever_id:reciever_id,type:type,amount:amount,memo:memo,result : JSON.stringify(result)},function(err,rows){
					if(!err)
					{						
					 	req.flash("success","Payment done Successfully txn# "+result.hash);
						res.redirect(301,'/dashboard/transactions');
					}
					else
					{
						res.send(err.sqlMessage);
					}
				});
			    
			  })
			  .catch(function(error) {
			    console.error('Something went wrong!', error);
			    // If the result is unknown (no response body, timeout etc.) we simply resubmit
			    // already built transaction:
			    // server.submitTransaction(transaction);
			    res.send(error);
			  });
	}

 app.get('/', function(req, res) {
   res.render('pages/index', { flash: req.flash() });
 });
 app.get('/about', function(req, res) {
   res.render('pages/about',{flash: req.flash()});
 });
 app.get('/sign-up', csrfProtection, function(req, res) {
   res.render('pages/sign-up', { flash: req.flash(),csrfToken: req.csrfToken() });
 });
 app.post('/signUp', parseForm, csrfProtection, function(req, res) {
 	
  req.checkBody("password", "Enter a password.").notEmpty();
  req.checkBody("email", "Enter a valid email address.").isEmail();
  req.checkBody("name", "Enter a name.").notEmpty();

  var errors = req.validationErrors();
  if (errors) {
   	req.flash('danger','Please validate or fill required fields.')
    res.redirect(301,req.headers.referer);
  } else {

 	var db_user= require("../models/User");
 	var bcrypt = require('bcrypt');
 	var saltRounds = 10;
 	var salt = bcrypt.genSaltSync(saltRounds);
	var hash = bcrypt.hashSync(req.body.password, salt);
 	db_user.addUser({name:req.body.name,password:hash,email:req.body.email},function(err,resp){
 		// res.send(resp+" "+ err);
 		if(!err)
 		{ 			
	    req.flash("success","Register Successfully");
			res.redirect(301, '/');
 		}
 		else
 		{ 			
	  	req.flash("danger",err.sqlMessage);
			res.redirect(301, '/sign-up');
 		}
 	});
 }
   // res.render('pages/sign-up', { csrfToken: req.csrfToken() });
 });
	app.get('/sign-in',csrfProtection, function(req, res) {
   res.render('pages/sign-in', { flash:req.flash(),csrfToken: req.csrfToken(),remember : req.cookies });
 	});
	app.post('/login', parseForm, csrfProtection, function(req, res) {
		console.log("inside login");
   var db_user= require("../models/User");
   var bcrypt = require('bcrypt');
   var saltRounds = 10;
   var email=req.body.email;
   var password=req.body.password;
   req.checkBody("email", "Enter a valid email address.").isEmail();
   req.checkBody("password", "Enter a password.").notEmpty();

  var errors = req.validationErrors();
  if (errors) {
  	console.log("inside error");
		 req.flash('danger', 'Please validate or fill required fields.');
    res.redirect(301,req.headers.referer);
    return;
  } else {
    // normal processing here
    if (req.body.remember) {          
          res.cookie('remember',{email:email,password:password},{ maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });
           // Cookie expires after 30 days
        } else {
        	 res.cookie('remember','',{ maxAge: -30 * 24 * 60 * 60 * 1000, httpOnly: true });
        	//Cookie deleted
        }
   db_user.checkUser(email,function(err,rows){
   	if(!err)
   	{
   		if(rows.length)
   		{
	   		check=bcrypt.compareSync(password, rows[0].encrypted_password);
	   		if(check)
	   		{	   			
		    	req.flash('success', 'Login Successfully');
		    	req.session.user=rows[0];    	
				res.redirect(301, '/dashboard');

	   		}
	   		else
	   		{   			
		    	req.flash("danger","Please check your credentials");
					res.redirect(301, '/sign-in');
	   		}
   	 	}
   	 	else
   	 	{
   	 		
		    req.flash("danger","Please check your credentials");
				res.redirect(301, '/sign-in');
   	 	}
   	}
   	else
   	{   		
	    req.flash("danger",err.sqlMessage);
   		res.redirect(301, '/sign-in');
   	}

   });

 }
 	});
	app.get('/logOut', function (req, res) {
		res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
		 console.log("Logout start");
		 // req.session.user=null;
		 delete req.session.user;
		 req.flash("success","Successfully logout");
     res.redirect(301, '/sign-in');
	   
	});
	app.get('/dashboard', csrfProtection,isLoggedIn, function(req, res) {
	   res.render('pages/dashboard/index', {'page_name':'dashboard',layout:'layout_dashboard', flash: req.flash(),user:req.session.user });
	 });
	app.get('/dashboard/profile',csrfProtection,isLoggedIn, function(req, res) {
		var db_account= require("../models/Accounts");
		db_account.getAllAccounts(req.session.user.id,function(err,rows){

			if(!err){
			db_account.getDefaultAccount(req.session.user.id,function(err,default_account){
				if(!err)
				{
					res.render('pages/dashboard/profile', {'page_name':'dashboard_profile', flash: req.flash(),user:req.session.user,accounts:rows,default_account:default_account,csrfToken: req.csrfToken(),layout:'layout_dashboard' });
				}
				else
				{
					res.send(err.sqlMessage);
				}

			});		
			
			}
			else
			{
				res.send(err.sqlMessage);
			}

		});

	   
	 });
	app.post('/dashboard/profile/update', parseForm, csrfProtection,isLoggedIn, function(req, res) {
		var db_account= require("../models/Accounts");
		db_account.defaultAccount({user_id:req.session.user.id,account_id:req.body.default_account},function(err,rows){

			if(!err){
			  req.flash("success","Successfully updated");
				res.redirect(301,'/dashboard/profile');
			}
			else
			{
				res.send(err.sqlMessage);
			}

		});

	   
	 });
	app.get('/dashboard/wallets', csrfProtection,isLoggedIn, function(req, res) {
		// res.send("TEST");
	   res.render('pages/dashboard/wallet', { 'page_name':'dashboard_wallet',flash : req.flash(),user:req.session.user, layout:'layout_dashboard'});
	 });

	app.get('/dashboard/transactions', csrfProtection,isLoggedIn, function(req, res) {
		// res.send("TEST");
		var db_account= require("../models/Accounts");
		var db_transaction= require("../models/Transactions");
		var db_user= require("../models/User");
		db_account.getAllAccounts(req.session.user.id,function(err,rows){
			if(!err)
			{
				db_transaction.getAllTransactions(req.session.user.id,function(err,transactions){
					if(!err)
					{
						db_user.getAllUsers(function(err,users){
							if(!err)
							{
								res.render('pages/dashboard/transactions', { 'page_name':'dashboard_transactions',flash: req.flash(),accounts:rows,user:req.session.user,transactions : transactions,users:users,csrfToken: req.csrfToken(), layout : 'layout_dashboard'});
							}
							else
							{
								res.send(err);
							}
							

						});
					
					}
					else
					{
						res.send(err.sqlMessage);
					}

				});
				
			}
			else
			{
				res.send(err.sqlMessage);
			}
			

		});
	   
	 });
	app.get('/dashboard/payments', csrfProtection,isLoggedIn, function(req, res) {
		// res.send("TEST");
		var db_account= require("../models/Accounts");		
		var db_user= require("../models/User");
		db_account.getAllAccounts(req.session.user.id,function(err,rows){
			if(!err)
			{
				db_user.getAllUsers(function(err,users){
							if(!err)
							{
								
								res.render('pages/dashboard/payments', { 'page_name':'payments',flash: req.flash(),accounts:rows,user:req.session.user, users:users,csrfToken: req.csrfToken(), layout : 'layout_dashboard'});
							}
							else
							{
								res.send(err);
							}
						});
						
			}
			else
			{
				res.send(err.sqlMessage);
			}
			

		});
	   
	 });

		app.get('/dashboard/account/offers/', csrfProtection,isLoggedIn, function(req, res) {

			var db_account= require("../models/Accounts");
				db_account.getAllAccounts(req.session.user.id,function(err,rows){
					if(!err)
					{	
					var db_asset = require("../models/Asset");
				db_asset.getAllAssets(req.session.user.id,function(err,assets){
						if(!err)
						{
							console.log("Offer here");
							console.log(req.session.offer);
							res.render('pages/dashboard/account_offers', { 'page_name':'dashboard_offers',flash: req.flash(),user:req.session.user,csrfToken: req.csrfToken(),accounts:rows,account_offer:req.session.offer, layout:'layout_dashboard',assets:assets});
						}
						else
						{
							res.send(err.sqlMessage)
						}
						});					
					}
					else
					{
						res.send(err.sqlMessage);
					}

				});	   
	 });
		app.get('/removeOffer',csrfProtection, parseForm , isLoggedIn, function(req, res) {
			req.session.offer=null;
			res.send("Done");
		});

		app.get('/checkOffer/:account_id',csrfProtection, isLoggedIn, function(req, res) {
 			var account_id= req.params.account_id;
 			var StellarSdk = require('stellar-sdk');
			var server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
			server.offers('accounts', account_id)
			  .call()
			  .then(function (offerResult) {
			    console.log(offerResult);
			    req.session.offer={account_id:account_id,result: offerResult};
			    // req.flash('success','Check your offer');
			    res.redirect(301,'/dashboard/account/offers/');
			  })
			  .catch(function (err) {
			    console.error(err);
			    res.send(err);
			  })
   
 	});

	app.post('/dashboard/account/offer/new', parseForm,csrfProtection, isLoggedIn, function(req, res) {

			var StellarSdk = require('stellar-sdk')
			StellarSdk.Network.useTestNetwork();
			var server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
			var Sourceaccount = req.body.account;
			var amount = req.body.amount;
			var account_id = req.body.account_id;
			var sourceSecretKey = req.body.secret;
			var sourceKeypair = StellarSdk.Keypair.fromSecret(sourceSecretKey);
			selling_asset= req.body.selling;			
			buying_asset= req.body.buying;			
			var op ={
			        selling: selling_asset=="XLM" ? new StellarSdk.Asset.native() :  new StellarSdk.Asset(selling_asset,Sourceaccount),
			        buying: buying_asset=="XLM" ? new StellarSdk.Asset.native() : new StellarSdk.Asset(buying_asset, Sourceaccount),
			        amount: amount,
			        price: req.body.price,
			        offerId:0
			      }
			var sourcePublicKey = sourceKeypair.publicKey();
			server.loadAccount(sourcePublicKey)
			  .then(function(account) {
			    var transaction = new StellarSdk.TransactionBuilder(account)
			      // Add a manageOffer operation
			      .addOperation(StellarSdk.Operation.manageOffer(op))
			      .build();
			    transaction.sign(sourceKeypair);
			    console.log(transaction.toEnvelope().toXDR('base64'));
			    server.submitTransaction(transaction)
			      .then(function(transactionResult) {
			        console.log(JSON.stringify(transactionResult, null, 2));
			        console.log('\nSuccess! View the transaction at: ');
			        console.log(transactionResult._links.transaction.href);
			        req.flash("success","Transaction at "+transactionResult._links.transaction.href);
			        //save to db
								var db_transaction= require("../models/Transactions");
								db_transaction.addPayment({user_id:req.session.user.id,sender_id:account_id,reciever_id:account_id,type:"offer",amount:amount,memo:"new offer",result : JSON.stringify(transactionResult)},function(err,rows){
									if(!err)
									{						
									 	
										res.redirect(301,"/dashboard/account/offers/")
									}
									else
									{
										res.send(err.sqlMessage);
									}
								});



			        
			      })
			      .catch(function(err) {
			        console.log('An error has occured:');
			        console.log(err);
			        req.flash("danger",err);
			        res.redirect(301,"/dashboard/account/offers/")
			      });
			  })
			  .catch(function(e) {
			    console.error(e);
			  });

		});
	app.get('/dashboard/orderbook',csrfProtection, parseForm , isLoggedIn, function(req, res) {
		var db_asset = require("../models/Asset");
				db_asset.getAllAssets(req.session.user.id,function(err,assets){
					if(!err)
					{												
						res.render('pages/dashboard/order_book', { 'page_name':'order_book',assets:assets,flash: req.flash(),user:req.session.user,csrfToken: req.csrfToken(), layout:'layout_dashboard'});
					}
					else
					{
						res.send(err.sqlMessage);
					}

				});
			
		});
	app.get('/dashboard/orderbook/find',parseForm ,csrfProtection , isLoggedIn, function(req, res) {
	var StellarSdk = require('stellar-sdk');
	var server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
	var selling_asset= req.query.selling_asset;	
	var buying_asset= req.query.buying_asset;
	if(selling_asset!="native")
	{
		var non_native_selling= req.query.non_native_selling_code.split("-IS-");
	}
	if(buying_asset!="native")
	{
		var non_native_buying= req.query.non_native_buying_code.split("-IS-");
	}	

			server.orderbook(selling_asset=='native' ? new StellarSdk.Asset.native() : new StellarSdk.Asset(non_native_selling[0], non_native_selling[1]) , buying_asset=='native' ? new StellarSdk.Asset.native() :  new StellarSdk.Asset(non_native_buying[0], non_native_buying[1]))
  .call()
  .then(function(resp) { console.log(resp); 
  	res.send(resp);
  })
  .catch(function(err) { console.log(err); })


		});
	app.get('/dashboard/asset', csrfProtection,isLoggedIn, function(req, res) {
		// res.send("TEST");
		var db_account= require("../models/Accounts");
		db_account.getAllAccounts(req.session.user.id,function(err,rows){
			if(!err)
			{			
				var db_asset = require("../models/Asset");
				db_asset.getAllAssets(req.session.user.id,function(err,assets){
					if(!err)
					{
						console.log("assets");
						console.log(assets);
						res.render('pages/dashboard/asset', { 'page_name':'dashboard_asset',accounts:rows,flash: req.flash(),user:req.session.user,csrfToken: req.csrfToken(),assets:assets, layout:'layout_dashboard'});
					}
					else
					{
						res.send(err.sqlMessage);
					}

				});
				
			}
			else
			{
				res.send(err.sqlMessage);
			}
			

		});
	   
	 });
	app.post('/dashboard/asset/new',parseForm, csrfProtection,isLoggedIn, function(req, res) {
		var StellarSdk = require('stellar-sdk');
			StellarSdk.Network.useTestNetwork();
			var server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
			var asset_limit=req.body.asset_limit;
			var asset_code=req.body.code;
			var asset_image_url=req.body.asset_image_url;
			var asset_name=req.body.asset_name;
			var asset_description=req.body.asset_desc;
			var asset_issuer = req.body.asset_issuer;	
			var asset_reciever = req.body.asset_reciever;

			var asset_issuer_ar=asset_issuer.split("-Id-");
			var asset_issuer=asset_issuer_ar[0];
			var asset_issuer_id=asset_issuer_ar[1];

			var asset_reciever_ar=asset_reciever.split("-Id-");
			var asset_reciever=asset_reciever_ar[0];
			var asset_reciever_id=asset_reciever_ar[1]; 
 			// Keys for accounts to issue and receive the new asset
			var issuingKeys = StellarSdk.Keypair
			  .fromSecret(asset_issuer);
			var receivingKeys = StellarSdk.Keypair
			  .fromSecret(asset_reciever);

			// Create an object to represent the new asset
			var newAsset = new StellarSdk.Asset(asset_code, issuingKeys.publicKey());

	// First, the receiving account must trust the asset
	server.loadAccount(receivingKeys.publicKey())
	  .then(function(receiver) {
	    var transaction = new StellarSdk.TransactionBuilder(receiver)
      // The `changeTrust` operation creates (or alters) a trustline
      // The `limit` parameter below is optional
      // https://pbs.twimg.com/profile_images/666921221410439168/iriHah4f.jpg
      .addOperation(StellarSdk.Operation.changeTrust({
        asset: newAsset,
        limit: asset_limit        
      }))
      .addOperation(StellarSdk.Operation.manageData({
        name: 'asset_name',value: asset_name//,
        //desc: asset_description,
       // image: asset_image_url
      }))
      .build();
    transaction.sign(receivingKeys);
    return server.submitTransaction(transaction);
  })
  .then(function(result) {
			    console.log('Success! Results:', result);
			    if(result)
			    {
			    	var db_transaction= require("../models/Transactions");
				db_transaction.addPayment({user_id:req.session.user.id,sender_id:asset_issuer_id,reciever_id:asset_reciever_id,type:"asset",amount:asset_limit,memo:"New asset creation",result : JSON.stringify(result)},function(err,rows){
					if(!err)
					{
						console.log("Submit txn");
						console.log(rows);
						var db_asset=require("../models/Asset");
			    	db_asset.addAssets({asset_name:asset_name,asset_image_url:asset_image_url,asset_description:asset_description,asset_code:asset_code,asset_issuer:asset_issuer_id,asset_reciever:asset_reciever_id,asset_limit:asset_limit,user_id:req.session.user.id,transaction_id:rows.insertId,status:1},function(err,rows){
			    		if(!err)
			    		{			    			
					    	req.flash("success","Asset Created Successfully txn# "+result.hash);
								res.redirect(301,'/dashboard/asset');
			    		}
			    		else
			    		{
			    			res.send(err);
			    		}

			    	});

						
					}
					else
					{
						res.send(err.sqlMessage);
					}


			    	
			    });
			}
			    
})

  // Second, the issuing account actually sends a payment using the asset
  // .then(function() {
  //   return server.loadAccount(issuingKeys.publicKey())
  // })
  // .then(function(issuer) {
  //   var transaction = new StellarSdk.TransactionBuilder(issuer)
  //     .addOperation(StellarSdk.Operation.payment({
  //       destination: receivingKeys.publicKey(),
  //       asset: astroDollar,
  //       amount: '10'
  //     }))
  //     .build();
  //   transaction.sign(issuingKeys);
  //   return server.submitTransaction(transaction);
  // })
  .catch(function(error) {
    console.error('Error!', error);
    res.send(error);
  });

			
	});
	app.get('/dashboard/paths/', csrfProtection,isLoggedIn, function(req, res) {
			var db_account= require("../models/Accounts");
		db_account.getAllAccounts(req.session.user.id,function(err,rows){
			if(!err)
			{
					res.render('pages/dashboard/paths', { 'page_name':'dashboard_paths',flash: req.flash(),accounts:rows,user:req.session.user,csrfToken: req.csrfToken(), layout:'layout_dashboard', layout:'layout_dashboard' });

			}
			else
			{
				res.send(err.sqlMessage);
			}
			

		});

	})
	app.get('/dashboard/paths/find',parseForm, csrfProtection,isLoggedIn, function(req, res) {
		console.log("start")
			var request = require('request');
			var url="https://horizon-testnet.stellar.org/paths"
			var propertiesObject = { source_account:req.params.source_account, destination_account:req.params.destination_account,destination_asset_type:req.params.destination_asset_type,destination_amount:req.params.destination_amount };

			request({url:url, qs:propertiesObject}, function(err, response, body) {
			  if(err) { console.log(err); return; }
			  console.log("Get response: " + response.statusCode);
						console.log(response.body);
						res.send(response.body);
						})
	});
	app.get('/dashboard/accounts/', csrfProtection,isLoggedIn, function(req, res) {
	
		var db_account= require("../models/Accounts");
		db_account.getAllAccounts(req.session.user.id,function(err,rows){
			if(!err)
			{
					res.render('pages/dashboard/accounts', { 'page_name':'dashboard_accounts',flash: req.flash(),accounts:rows,user:req.session.user,csrfToken: req.csrfToken(), layout: 'layout_dashboard' });
			}
			else
			{
				res.send(err.sqlMessage);
			}		

		});
			   
	 });
	app.post('/dashboard/accounts/merge', parseForm, csrfProtection,isLoggedIn, function(req, res) {
		console.log("All data");
		console.log(req.body);
		var db_account= require("../models/Accounts");
		var StellarSdk = require('stellar-sdk');
		var server = new StellarSdk.Server('https://horizon-testnet.stellar.org/');
		StellarSdk.Network.useTestNetwork();
		var sourceSecretKey = req.body.source;
		var destination = req.body.destination;
 		var sourceKeypair = StellarSdk.Keypair.fromSecret(sourceSecretKey);
		var sourcePublicKey = sourceKeypair.publicKey();
		server.loadAccount(sourcePublicKey)
  .then(function(account) {
    var transaction = new StellarSdk.TransactionBuilder(account)
      // Add a manageOffer operation
      .addOperation(StellarSdk.Operation.accountMerge({    destination: destination,
        source: sourcePublicKey
      }))
      .build();
    transaction.sign(sourceKeypair);
    console.log("transaction toEnvelope");
    console.log(transaction.toEnvelope().toXDR('base64'));
    
    server.submitTransaction(transaction)
      .then(function(transactionResult) {
        console.log(JSON.stringify(transactionResult, null, 2));
        console.log('\nSuccess! View the transaction at: ');
        console.log(transactionResult._links.transaction.href);
        res.send(transactionResult);
      })
      .catch(function(err) {
        console.log('An error has occured:');
        console.log(err);
        res.send(err);
      });
  })
  .catch(function(e) {
    console.error(e);
    res.send(e);
  	});			   
	 });

	app.post('/dashboard/accounts/stellar', parseForm, csrfProtection,isLoggedIn, function(req, res){
		//stellar sdk
		var StellarSdk=require('stellar-sdk');
		var pair = StellarSdk.Keypair.random();
		var private_key = pair.secret();
		var public_key = pair.publicKey();
		var request = require('request');
		request.get({
		  url: 'https://horizon-testnet.stellar.org/friendbot',
		  qs: { addr: public_key },
		  json: true
		}, function(error, response, body) {
		  if (error || response.statusCode !== 200) {
		    // console.error('ERROR!', error || body);
		    req.flash("danger",body.title);
		    res.redirect(301,'/dashboard/accounts');
		  }
		  else {		  	
			    req.flash("success","SUCCESS! You have a new account");
			var db_account= require("../models/Accounts");
			    	db_account.addAccount({user_id:req.session.user.id,name:'stellar',address:JSON.stringify(body),private_key:private_key,public_key:public_key},function(err,rows){
			    		console.log("Error");
			    		console.log(err);
			    	res.redirect(301,'/dashboard/accounts');
			    	});
		    console.log('SUCCESS! You have a new account :)\n', body);
		  }
		});
		

	});
	app.get('/dashboard/accounts/balance/:public_key',isLoggedIn, function(req, res){
		var public_key= req.params.public_key;
		var StellarSdk=require('stellar-sdk');
		var server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
	// the JS SDK uses promises for most actions, such as retrieving an account
	server.loadAccount(public_key).then(function(account) {
	  console.log('Balances for account: ' + public_key);
	  //balances=account.balances;
	  account.balances.forEach(function(balance) {
	    console.log('Type:', balance.asset_type, ', Balance:', balance.balance);
	    console.log(balance);
	    req.flash("success","Asset type : "+balance.asset_type+" Balance : "+balance.balance);  	    
	  });
	  res.redirect(301,"/dashboard/accounts/");
	});	

	});
app.get('/getStellarAccount',isLoggedIn, function(req, res){
	
	var StellarSdk = require('stellar-sdk');
	var server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
	var public_key = req.query.public_key;
	server.loadAccount(public_key).then(function(account) {
	  res.send(account.balances);	  
	});
});
app.get('/setNetwork',isLoggedIn,function(req, res){
	network = req.query.type;
	
	var db_user= require("../models/User");
	var network_url="";
	if(network=='public')
			{
				network_url = 'https://horizon.stellar.org';		
			}
			else
			{
				network_url= 'https://horizon-testnet.stellar.org'
			}
	db_user.setUserNetwork({network:network,network_url:network_url,user_id:req.session.user.id},function(err,rows){
		if(!err)
		{
			req.flash("success","SUCCESS! You have changed your network to "+network+" .");
			    	req.session.user.network=network;
			    	req.session.user.network_url=network_url;
			res.redirect(301,req.headers.referer);			
		}
		else
		{
			res.send(err);
		}
		
	});
	

	
});
	app.post('/dashboard/accounts/payment/',parseForm, csrfProtection,isLoggedIn, function(req, res){
	var sender =req.body.sender;
	sender_ar=sender.split("-Id-");
	sender=sender_ar[0];
	sender_id=sender_ar[1];
	var memo = req.body.memo;
	var amount = req.body.amount;
	var type = req.body.type;
	var reciever =req.body.reciever;

	if(type=='other')
	{
		var db_account = require("../models/Accounts");
		var async = require("async");
		db_account.getDefaultAccount(reciever,function(err,u){
			if(!err)
			{
				console.log(u[0].public_key);
				reciever = u[0].public_key;
				reciever_id = u[0].id;
				var destinationId = reciever;
				sendTransaction(req,res,sender,destinationId,sender_id,reciever_id,type,amount,memo);
			}
			else
			{
				res.send(err);
			}
			
		});
	}
	if(type=='self')
	{

		reciever_ar = reciever.split("-Id-");
		reciever = reciever_ar[0];
		reciever_id = reciever_ar[1];
		var destinationId = reciever;
		sendTransaction(req,res,sender,destinationId,sender_id,reciever_id,type,amount,memo);

	}

	});
	};