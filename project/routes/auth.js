const express = require('express');
const router = express.Router();
const sanitizeHtml = require('sanitize-html');
const bcrypt = require('bcrypt');
const passport = require('passport');

const salt = require('../lib/salt');
const getConnection = require('../lib/db');

router.get('/kakao', 
  passport.authenticate('kakao-login'));

router.get('/kakao/callback', 
  passport.authenticate('kakao-login', {
    successRedirect: '/',
    failureRedirect: '/auth/login'
  })
);

router.get('/login', (req, res) => {
  if (req.user) {
    res.redirect(302, '/');
  } else {
    const nickname = req.user ? req.user.name : '';
    const title = 'Login';
    res.render('login', { nickname, title }, (err, html) => {
      if (err)
        next(err);
      res.status(200).send(html);
    });  
  }
});

router.post('/login',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/auth/login'
  })
);

router.get('/logout', (req, res) => {
  if (!req.user) {
    res.redirect(302, '/');
  } else {
    req.logout();
    req.session.save(err => {
      if (err)
        next(err);
      res.redirect(302, '/');
    });
  }
});

router.get('/join', (req, res) => {
  if (req.user) {
    res.redirect(302, '/');
  } else {
    const nickname = req.user ? req.user.name : '';
    const title = '회원 가입 폼';
    res.render('join', { nickname, title }, (err, html) => {
      if (err)
        next(err);
      res.status(200).send(html);
    });
  }
});

router.post('/join', (req, res) => {
  let password = '';
  bcrypt.hash(sanitizeHtml(req.body.pw), salt, (err3, hash) => {
    if (err3)
      next(err3);
    password = hash;
    getConnection(conn => {
      conn.query(`insert into user (email, pw, name, profile) values (?, ?, ?, ?)`,
      [sanitizeHtml(req.body.email), password, sanitizeHtml(req.body.nickname),
      sanitizeHtml(req.body.profile)], (err, result) => {
        if (err)
          next(err);
        conn.query(`select * from user where id=?`, [result.insertId], (err2, user) => {
          if (err2)
            next(err2);
          // req.session.nickname = user[0].name;
          // req.session.email = user[0].email;
          // req.session.isLogined = true;
          req.session.save(err3 => {
            if (err3)
              next(err3);
            res.redirect(302, '/');
          });
        });
      });
      conn.release();
    });
  });
});

router.get('/update', (req, res) => {
  if (!req.user) {
    res.redirect(403, '/');
  } else {
    getConnection(conn => {
      conn.query(`select * from user where email=?`, [req.user.email],
      (err, result) => {
        if (err)
          next(err);
        const title = '회원 정보 수정';
        res.render('update-user', {
          email: result[0].email,
          nickname: req.user.name,
          profile: result[0].profile,
          title
        }, (err, html) => {
          if (err)
            next(err);
          res.status(200).send(html);
        });
      });
    });
  }
});

router.post('/update', (req, res) => {
  bcrypt.hash(sanitizeHtml(req.body.pw), salt, (err3, hash) => {
    if (err3)
      next(err3);
    password = hash;
    getConnection(conn => {
      conn.query(`update user set name=?, pw=?, profile=? where email=?`,
      [sanitizeHtml(req.body.nickname), password,
      sanitizeHtml(req.body.profile), req.body.email],
      (err, result) => {
        if (err)
          next(err);
        res.status(200).send('수정이 완료되었습니다. <a href="/">홈으로 가기</a>');
      });
      conn.release();
    });    
  });
});

router.get('/deactivate', (req, res) => {
  if (!req.user) {
    res.redirect(403, '/');
  } else {
    const nickname = req.user ? req.user.name : '';
    const title = '회원 탈퇴';
    res.render('deactivate', { nickname, title },
    (err, html) => {
      if (err)
        next(err);
      res.status(200).send(html);
    });  
  }
});

router.post('/deactivate', (req, res) => {
  getConnection(conn => {
    conn.query(`delete from user where email=?`, [req.user.email], (err, result) => {
      if (err)
        next(err);
      req.session.destroy(err2 => {
        if (err2)
          next(err2);
        res.status(200).send('안녕히 가세요. <a href="/">홈으로 가기</a>');
      })
    });
    conn.release();
  });
});

module.exports = router;