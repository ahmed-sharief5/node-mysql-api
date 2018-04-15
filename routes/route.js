///// required modules 

var express = require('express')
var app = express()
var empty = require('is-empty');
var md5 = require('md5');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcryptjs');
var VerifyToken = require('./verfiyToken');


app.get('/me',VerifyToken, function(req, res, next) {
	let userId = req.userId;
	console.log(userId)
	if(userId){
		res.status(200).send({
			auth: true,
			userId:userId,
			message: "Authenticated"
		 });
	}
	else{
		res.status(500).send({
			auth: false,
			message: "Token Expired"
		});
		// res.send({
		// 	code:500,
		// 	message: "Token Expired"
		//  });
	}
	


  });


// REGISTER FOR USER
app.post('/register', function(req, res, next){	
    req.assert('email', 'A valid email is required').isEmail()  //Validate email
    req.check("password", "Password does not match the requirements").isLength({ min: 5 }); //Validate password
    
    var errors = req.validationErrors()
    let email = req.sanitize('email').escape().trim();
    
    if( !errors ) { 
		var user = {
            email: req.sanitize('email').escape().trim(),
            password: md5(req.sanitize('password').escape().trim())
		}
		req.getConnection(function(error, conn) {
            conn.query("SELECT * FROM login WHERE email = '"+ email + "'", function(err, response) {
                if(response.length){
                    res.send({
                        code:202,
                        message:"Email already exists. Please try with other email",
                        });
                } else{
                    conn.query('INSERT INTO login SET ?', user, function(err, result) {
                        //if(err) throw err
                        if (err) {
                            res.send({
                                code:202,
                                result:err
                              });
                            //return res.send(err);
                            
                        } else {
                            // create a token
                            var token = jwt.sign({ id: result.insertId }, 'RestfulApi', {
                                expiresIn: Math.floor(Date.now() / 1000) + 60 * 60
                            });		
                            res.send({
                                code:200,
                               	message:"Registration successful",
                                result: result[0],
                                auth: true,
								token: token,
								expiresIn: Math.floor(Date.now() / 1000) + 60 * 60
                                });	
                                    
                            //return res.send('Register successful');
                            
                        }
                    })
                }
            })

		})
	}
	else {   //Display errors to user
		var error_msg = ''
		errors.forEach(function(error) {
			error_msg += error.msg + '<br>'
		})				
		req.flash('error', error_msg)	
		res.send({
			code:202,
			result:error_msg
		  });	
		return error_msg
    }
})

// CHECK LOGIN FOR USER
app.post('/login', function(req, res, next){	
    req.assert('email', 'A valid email is required').isEmail()  //Validate email
    req.check("password", "Password does not match the requirements"); //Validate password

    var errors = req.validationErrors()
    
    if( !errors ) { 
		
        let email = req.sanitize('email').escape().trim();
            password = md5(req.sanitize('password').escape().trim())

		req.getConnection(function(error, conn) {
			conn.query("SELECT id,email FROM login WHERE email = '"+ email + "' and password = '"+password+"'", function(err, result) {
                if(result.length){
					// create a token
                    var token = jwt.sign({ id: result[0].id }, 'RestfulApi', {
                        expiresIn: Math.floor(Date.now() / 1000) + 60 * 60
                    });
                    res.send({
                       code:200,
                       message:"login sucessfull",
                       auth: true,
					   token: token,
					   expiresIn: Math.floor(Date.now() / 1000) + 60 * 60
                    });
                   
               }
               else{
                    res.send({
                       code:202,
                        message:"Wrong Credentials"
                     });
               }
                
			})
		})
	}
	else {   //Display errors to user
		var error_msg = ''
		errors.forEach(function(error) {
			error_msg += error.msg + '<br>'
		})				
		res.send({
			code:202,
			result:error_msg
		  });	
		return error_msg;
    }
})


// LOGOUT USER
app.get('/logout', function(req, res) {
	res.status(200).send({ auth: false, token: null });
  });

// SHOW LIST OF EMPLOYEE
app.get('/',VerifyToken, function(req, res, next) {
	//console.log(req.headers['x-access-token'])
	let userId = req.userId;
	req.getConnection(function(error, conn) {
		conn.query('SELECT * FROM users WHERE user_id ='+ userId ,function(err, rows, fields) {
			
			if (err) {
				req.flash('error', err)
				
			} else {
				//console.log(rows)
				res.end(JSON.stringify(rows));
			}
		})
	})
})

// ADD NEW EMPLOYEE POST ACTION
app.post('/add',VerifyToken, function(req, res, next){	
	req.assert('name', 'Name is required').notEmpty()           //Validate name
	req.assert('age', 'Age is required and should be a number').isNumeric()             //Validate age
    req.assert('email', 'A valid email is required').isEmail()  //Validate email
	let userId = req.userId;
    var errors = req.validationErrors()
    
    if( !errors ) {  
		
		var user = {
			name: req.sanitize('name').escape().trim(),
			age: req.sanitize('age').escape().trim(),
			email: req.sanitize('email').escape().trim(),
			user_id: userId
		}
		console.log(user)
		req.getConnection(function(error, conn) {
			conn.query('INSERT INTO users SET ?', user, function(err, result) {
				//if(err) throw err
				if (err) {
					req.flash('error', err)
					
					
				} else {				
					req.flash('success', 'Data added successfully!')
					res.send({
						code:200,
						result:'Data added successfully!'
					  });
					
				}
			})
		})
	}
	else {   //Display errors to user
		var error_msg = ''
		errors.forEach(function(error) {
			error_msg += error.msg + '\n'
		})				
		res.send({
			code:202,
			result:error_msg
		  });
    }
})

// SHOW EDIT EMPLOYEE FORM
app.get('/edit/(:id)',VerifyToken, function(req, res, next){
	let userId = req.userId;
	req.getConnection(function(error, conn) {
		conn.query('SELECT * FROM users WHERE id = ' + req.params.id +' and user_id ='+ userId, function(err, rows, fields) {
			if(err) throw err
			
			// if user not found
			if (rows.length <= 0) {
				req.flash('error', 'User not found with id = ' + req.params.id)
				//console.log(rows)
				res.end(JSON.stringify(rows));
			}
			else { // if user found
				// render to views/user/edit.ejs template file
				//console.log(rows)
				res.end(JSON.stringify(rows));
				
			}			
		})
	})
})

// EDIT EMPLOYEE POST ACTION
app.put('/edit/(:id)',VerifyToken, function(req, res, next) {
	let userId = req.userId;
	req.assert('name', 'Name is required').notEmpty()           //Validate name
	req.assert('age', 'Age is required and should be a number').isNumeric()   
    req.assert('email', 'A valid email is required').isEmail()  //Validate email

    var errors = req.validationErrors()
    var user = {
		name: req.sanitize('name').escape().trim(),
		age: req.sanitize('age').escape().trim(),
		email: req.sanitize('email').escape().trim(),
	}
	
    if( !errors ) {  

		req.getConnection(function(error, conn) {
			conn.query('UPDATE users SET ? WHERE id = ' + req.params.id+' and user_id ='+ userId, user, function(err, result) {
				//if(err) throw err
				if (err) {
					req.flash('error', err)
					
				} else {
					req.flash('success', 'Data updated successfully!')
					res.send({
						code:200,
						result:'Data updated successfully!'
					  });
					
				}
			})
		})
	}
	else {   //Display errors to user
		var error_msg = ''
		errors.forEach(function(error) {
			error_msg += error.msg + '\n'
		})
		res.send({
			code:202,
			result:error_msg
		  });
	
        
    }
})

// DELETE EMPLOYEE
app.delete('/delete/(:id)',VerifyToken, function(req, res, next) {
	let userId = req.userId;
	var user = { id: req.params.id }
	
	req.getConnection(function(error, conn) {
		conn.query('DELETE FROM users WHERE id = ' + req.params.id+' and user_id ='+ userId, user, function(err, result) {
			//if(err) throw err
			if (err) {
				req.flash('error', err)
				// redirect to users list page
			} else {
				req.flash('success', 'User deleted successfully! id = ' + req.params.id)
				// redirect to users list page
			}
		})
	})
})

module.exports = app
