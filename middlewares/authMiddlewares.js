const User = require('../models/User')
const mongoose = require('mongoose')


exports.redirectIfLoggedIn = (req, res, next) => {
   try {
         const userId = req.session.userId;
          if(userId) {
            return res.redirect('/account')
          }

          next()
   }catch(err) {
      console.log(err)
      res.status(500).send('Erreur server')
   }
}

exports.protect = async (req, res, next) => {
   try {
      const userId = req.session.userId

      if (!userId) {
         return res.redirect('/sign-in')
      }

      if (!mongoose.Types.ObjectId.isValid(userId)) {
         req.session.destroy()
         return res.redirect('/sign-in')
      }

      const user = await User.findById(userId).lean()

      if (!user) {
         req.session.destroy(() => {
           return res.redirect('/sign-in')
         })
      }

      req.user = user
      res.locals.user = user
      next()

   } catch (err) {
      console.error('Protect middleware error:', err)
      res.status(500).send('Erreur serveur')
   }
}