const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const cors = require('cors');
const db = require('knex')({
    client: 'pg',
    connection: {
      host : '127.0.0.1',
      user : 'postgres',
      password : '060669',
      database : 'smart-brain'
    }
  });



const app = express();
app.use(bodyParser.json());
app.use(cors());

app.get('/', (req, res) => {
    res.send('ok');
});

app.post('/signin', (req, res) => {
    db.select('email', 'hash').from('login')
    .where('email', '=', req.body.email)
        .then(data => {
            if(bcrypt.compareSync(req.body.password, data[0].hash)) {
                return db.select('*').from('users')
                .where('email', '=', req.body.email)
                .then(user => {
                    res.json(user[0]);
                })
                .catch(err => res.json('unable to get user').status(400))
            }
            else 
                res.status(400).json('wrong credentials')
        })
        .catch(err => res.status(400).json('wrong credentials'));
});

app.post('/register', (req, res) => {
    const { email, name, password } = req.body;
    const hash = bcrypt.hashSync(password, saltRounds);
        db.transaction(trx => (
            trx.insert({
                hash: hash,
                email: email
            })
            .into('login')
            .returning('email')
            .then(loginEmail => {
                return trx('users')
                .returning('*')
                .insert({
                    email: loginEmail[0],
                    name: name,
                    joined: new Date()
                })
                .then(user => {
                    res.json(user[0]);
                })                
            })
            .then(trx.commit)
            .catch(trx.rollback)
        ))
        .catch(err => res.json('unable to register').status(400));
});

app.get('/profile/:id', (req, res) => {
    const { id } = req.params;
   db.select('*').from('users').where({id})
    .then(user => {
        if(user.length)
            res.json(user[0])
        else
            res.status(400).json('not found')
   })
    .catch(err => res.status(400).json('error getting user'))
    

});

app.put('/image', (req, res) => {
    const { id } = req.body;
    db('users').where('id', '=', id)
    .increment('entries', 1)
    .returning('entries')
    .then(entries => {
        res.json(entries[0]).status(200);
    })
    .catch(err => {
        res.json('unable to get entry count').status(404);
    })
    
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`App is running on port ${PORT}`);
});

