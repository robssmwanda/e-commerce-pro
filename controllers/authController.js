const fs = require('fs')
const User = require('./../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto')
const sendEmail = require('../utils/sendEmail');
const sharp = require('sharp');
const path = require('path');


const createVerificationToken = (user) => {
  const token = crypto.randomBytes(32).toString('hex')
   user.verificationToken = crypto.createHash('sha256').update(token).digest('hex')
   user.verificationTokenExpires = Date.now() + 10 * 60 * 1000

   return token
}

const generateEmailTemplate = (url) => {
  return `
  <div style="font-family:Arial,sans-serif;padding:40px;">
    
    <h2>Bienvenue 👋</h2>

    <p>Merci pour ton inscription.</p>

    <p>Clique sur le lien ci-dessous pour activer ton compte :</p>

    <!-- ✅ LIEN CLAIR ET VISIBLE -->
    <p style="margin-top:20px;">
      <a href="${url}" style="color:#0071e3;font-size:16px;font-weight:bold;">
        👉 Vérifier mon compte
      </a>
    </p>

    <!-- ✅ URL EN CLAIR -->
    <p style="margin-top:20px;font-size:13px;">
      Ou copie ce lien :
    </p>

    <p style="word-break:break-all;color:#0071e3;">
      ${url}
    </p>

    <p style="margin-top:20px;font-size:12px;color:#777;">
      Ce lien expire dans 10 minutes.
    </p>

  </div>
  `;
};

// 🔐 Générer un token JWT
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: Number(process.env.JWT_COOKIE_EXPIRES_IN) * 24 * 60 * 60
  });
};


// 🍪 Envoyer le token dans un cookie
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + Number(process.env.JWT_COOKIE_EXPIRES_IN) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    sameSite: 'Strict'
  };

  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
  }

  res.cookie('jwt', token, cookieOptions);

  user.password = undefined;
  res.status(statusCode).redirect('/');
};

// 📝 INSCRIPTION
exports.createUser = async (req, res) => {
  try {

    // =====================================================
    // Vérifier email existant
    // =====================================================

    const existingEmail = await User.findOne({
      email: req.body.email
    });

    if (existingEmail) {
      return res.status(400).render('signup', {
        errors: { email: 'Email déjà utilisé' },
        formData: req.body
      });
    }

    // =====================================================
    // Validation
    // =====================================================

    const { birthDay, birthMonth, birthYear } = req.body;
    const errors = {};

    // =====================================================
    // VALIDATION INPUTS
    // =====================================================

    if (!req.body.firstname?.trim()) {
      errors.firstname = 'Le prénom est requis';
    }

    if (!req.body.lastname?.trim()) {
      errors.lastname = 'Le nom est requis';
    }

    if (!req.body.email?.trim()) {
      errors.email = 'Email requis';
    }

    if (!req.body.password?.trim()) {
      errors.password = 'Mot de passe requis';
    }

    if (!req.body.passwordConfirm?.trim()) {
      errors.passwordConfirm = 'Confirmation requise';
    }

    if (!req.body.country?.trim()) {
      errors.country = 'Choisissez un pays';
    }

    // =====================================================
    // VALIDATION DATE
    // =====================================================

    if (!birthDay || !birthMonth || !birthYear) {
      errors.dateOfBirth =
        'Date de naissance complète requise';
    }

    const day = Number(birthDay);
    const month = Number(birthMonth);
    const year = Number(birthYear);

    if (birthDay && (day < 1 || day > 31)) {
      errors.dateOfBirth = 'Jour invalide';
    }

    else if (birthMonth && (month < 1 || month > 12)) {
      errors.dateOfBirth = 'Mois invalide';
    }

    else if (
      birthYear &&
      (year < 1900 || year > new Date().getFullYear())
    ) {
      errors.dateOfBirth = 'Année invalide';
    }

    // =====================================================
    // STOP SI ERREURS
    // =====================================================

    if (Object.keys(errors).length > 0) {
      return res.status(400).render('signup', {
        errors,
        formData: req.body
      });
    }

    // =====================================================
    // CONSTRUIRE DATE
    // =====================================================

    const dateOfBirth = new Date(
      Date.UTC(year, month - 1, day)
    );

    // =====================================================
    // Vérification âge
    // =====================================================

    const today = new Date();

    let age =
      today.getUTCFullYear() -
      dateOfBirth.getUTCFullYear();

    const monthDiff =
      today.getUTCMonth() -
      dateOfBirth.getUTCMonth();

    const dayDiff =
      today.getUTCDate() -
      dateOfBirth.getUTCDate();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && dayDiff < 0)
    ) {
      age--;
    }

    // =====================================================
    // AGE MINIMUM
    // =====================================================

    if (age < 18) {
      return res.status(400).render('signup', {
        errors: {
          dateOfBirth:
            'Vous devez avoir au moins 18 ans'
        },
        formData: req.body
      });
    }

    // =====================================================
    // Création utilisateur
    // =====================================================

    const newUser = await User.create({
      firstname: req.body.firstname,
      lastname: req.body.lastname,
      email: req.body.email,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
      country: req.body.country,
      dateOfBirth,
      isVerified: false
    });

    // =====================================================
    // Générer token
    // =====================================================

    const token = createVerificationToken(newUser);

    await newUser.save({
      validateBeforeSave: false
    });

    // =====================================================
    // URL vérification
    // =====================================================

    const baseUrl =
      `${req.protocol}://${req.headers.host}`;

    const verifyURL =
      `${baseUrl}/verify-email/${token}`;

    // =====================================================
    // ENVOI EMAIL
    // =====================================================

    try {

      await sendEmail(
        newUser.email,
        'Vérification de ton compte',
        `
          <h2>Bienvenue 👋</h2>

          <p>
            Merci pour ton inscription.
          </p>

          <p>
            Clique sur le bouton ci-dessous
            pour activer ton compte :
          </p>

          <a href="${verifyURL}" 
            style="
              display:inline-block;
              padding:12px 20px;
              background:black;
              color:white;
              text-decoration:none;
              border-radius:6px;
            "
          >
            Vérifier mon compte
          </a>

          <p>
            Ce lien expire dans 10 minutes.
          </p>
        `
      );

    } catch (err) {

      // rollback si email échoue

      await User.findByIdAndDelete(newUser._id);

      return res.status(500).render('signup', {
        errors: {
          email:
            "Impossible d'envoyer l'email. Réessaie."
        },
        formData: req.body
      });
    }

    // =====================================================
    // SESSION + REDIRECTION
    // =====================================================

    req.session.email = newUser.email;

    req.flash(
      'success',
      'Un email de vérification a été envoyé 📩'
    );

    res.redirect('/check-email');

  } catch (err) {

    const errors = {};

    if (err.code === 11000) {
      errors.email = 'Email déjà utilisé';
    }

    if (err.errors) {

      for (let key in err.errors) {
        errors[key] = err.errors[key].message;
      }
    }

    return res.status(400).render('signup', {
      errors,
      formData: req.body
    });
  }
};

exports.login = async (req, res) => {
  try {

    const { email, password } = req.body;

    // =========================================================
    // ✅ vérifier email et mot de passe
    // =========================================================

    if (!email || !password) {
      return res.status(400).render('login', {
        error: 'Veuillez fournir un email et un mot de passe',
        formData: req.body,
        successMsg: []
      });
    }

    // =========================================================
    // ✅ rechercher utilisateur
    // =========================================================

    const user = await User.findOne({ email }).select('+password');

    // =========================================================
    // ✅ mauvais identifiants
    // =========================================================

    if (!user || !(await user.correctPassword(password))) {
      return res.status(401).render('login', {
        error: 'Email ou mot de passe incorrect',
        formData: req.body,
        successMsg: []
      });
    }

    // =========================================================
    // ✅ EMAIL NON VÉRIFIÉ
    // redirection vers check-email
    // =========================================================

    if (!user.isVerified) {

      // stocker email en session
      req.session.email = user.email;

      // message flash
      req.flash(
        'error',
        'Vérifie ton email avant de te connecter'
      );

      // redirection vers page check-email
      return res.redirect('/check-email');
    }

    // =========================================================
    // ✅ créer session utilisateur
    // =========================================================

    req.session.userId = user._id;

    req.session.user = {
      _id: user._id,
      name: user.name,
      email: user.email
    };

    // =========================================================
    // ✅ sauvegarder session
    // =========================================================

    req.session.save(() => {
      res.redirect('/');
    });

  } catch (err) {

    console.log(err);

    return res.status(401).render('login', {
      error: 'Une erreur est survenue lors de la connexion',
      formData: req.body
    });
  }
};

exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.redirect('/account'); // En cas d'erreur
        }
        // 2. Nettoyer le cookie de session
        res.clearCookie('connect.sid'); 
        // 3. Rediriger vers la page de connexion
        res.redirect('/');
    });
    
}


exports.verifyEmail = async (req, res) => {
  try {
    const crypto = require('crypto');

    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).render('error', {
        message: 'Lien invalide ou expiré'
      });
    }

    // ✅ activer le compte
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;

    await user.save();

    // ✅ connecter automatiquement
    req.session.userId = user._id;
    req.session.user = {
      _id: user._id,
      email: user.email
    };

    req.session.save(() => {
      req.flash('success', 'Compte activé avec succès 🎉');
      res.redirect('/');
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
};

exports.resendVerificationEmail = async (req, res) => {
  try {

    console.log(req.body.email);

    const { email } = req.body;

    // ✅ rechercher utilisateur
    const user = await User.findOne({ email });

    // ✅ utilisateur introuvable
    if (!user) {
      return res.status(404).render('check-email', {
        email: email,
        error: "Utilisateur introuvable"
      });
    }

    // ✅ si compte déjà vérifié
    if (user.isVerified) {
      return res.redirect('/');
    }

    // =========================================================
    // ✅ RESET AUTOMATIQUE APRÈS 24H
    // si le temps de blocage est terminé
    // on débloque automatiquement l’utilisateur
    // =========================================================

    if (
      user.resendBlockedUntil &&
      user.resendBlockedUntil < Date.now()
    ) {

      user.resendBlockedUntil = undefined;
      user.resendCount = 0;

      await user.save({ validateBeforeSave: false });
    }

    // =========================================================
    // ✅ UTILISATEUR TOUJOURS BLOQUÉ
    // =========================================================

    if (
      user.resendBlockedUntil &&
      user.resendBlockedUntil > Date.now()
    ) {

      return res.status(429).render('check-email', {
        email: user.email,
        error: "Trop de tentatives. Réessaie après 24h."
      });
    }

    // =========================================================
    // ✅ ANTI-SPAM : attendre 1 minute
    // =========================================================

    if (
      user.resendLastSentAt &&
      Date.now() - user.resendLastSentAt < 60000
    ) {

      return res.status(429).render('check-email', {
        email: user.email,
        error: "Attends 1 minute avant de renvoyer l’email"
      });
    }

    // =========================================================
    // ✅ INCRÉMENTER LE NOMBRE DE TENTATIVES
    // =========================================================

    user.resendCount = (user.resendCount || 0) + 1;

    // sauvegarder immédiatement
    await user.save({ validateBeforeSave: false });

    // =========================================================
    // ✅ SI 5 TENTATIVES ATTEINTES
    // bloquer pendant 24h
    // =========================================================

    if (user.resendCount >= 2) {

      user.resendBlockedUntil =
        Date.now() + 24 * 60 * 60 * 1000;

      await user.save({ validateBeforeSave: false });

      return res.status(429).render('check-email', {
        email: user.email,
        error: "Trop de tentatives. Réessaie dans 24h."
      });
    }

    // =========================================================
    // ✅ GÉNÉRER NOUVEAU TOKEN
    // =========================================================

    const token = createVerificationToken(user);

    // =========================================================
    // ✅ METTRE À JOUR LE TIMER
    // =========================================================

    user.resendLastSentAt = Date.now();

    await user.save({ validateBeforeSave: false });

    // =========================================================
    // ✅ URL DE VÉRIFICATION
    // =========================================================

    const verifyURL =
      `${req.protocol}://${req.headers.host}/verify-email/${token}`;

    // =========================================================
    // ✅ ENVOYER EMAIL
    // =========================================================

    await sendEmail(
      user.email,
      'Vérification de ton compte',
      generateEmailTemplate(verifyURL)
    );

    // =========================================================
    // ✅ STOCKER EMAIL EN SESSION
    // =========================================================

    req.session.email = user.email;

    // =========================================================
    // ✅ MESSAGE SUCCESS
    // =========================================================

    req.flash('success', 'Email renvoyé 📩');

    res.redirect('/check-email');

  } catch (err) {

    console.error(err);

    res.status(500).send('Erreur serveur');
  }
};

exports.updateProfile = async (req, res) => {
   try {

      await User.findByIdAndUpdate(
         req.user._id,
         {
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            recoveryEmail: req.body.recoveryEmail,
            phoneNumber: req.body.phoneNumber
         },
         {
            new: true,
            runValidators: true
         }
      )

      req.flash(
         'success',
         'Profil mis à jour'
      )

      res.redirect('/account')

   } catch(err) {
      console.log(err)

      res.redirect('/account/profile')
   }
}

exports.updatePassword = async (req, res) => {
   try {

      const user = await User
         .findById(req.user._id)
         .select('+password')

      const isCorrect = await user.correctPassword(req.body.currentPassword)

      if(!isCorrect) {

         req.flash(
            'error',
            'Mot de passe actuel incorrect'
         )

           return req.session.save(() => {
             res.redirect('/account/password')
         })
      }

      if(req.body.newPassword !== req.body.confirmPassword) {
         req.flash(
            'error',
            'Les mots de passe ne correspondent pas'
         )

         return req.session.save(() => {
           res.redirect('/account/password')
         })
    }

      user.password = req.body.newPassword
      user.passwordConfirm = req.body.confirmPassword

      await user.save()

      return res.redirect('/account/password?success=true');

   } catch(err) {

      console.log(err)

      req.flash(
         'error',
         'Erreur serveur'
      )

      return req.session.save(() => {
        res.redirect('/account/password')
    })

   }
}


exports.forgotPassword = async (req, res) => {

   try {
  
      const user = await User.findOne({
         email: req.body.email
      });

      if (!user) {

         req.flash(
            'error',
            'Aucun utilisateur trouvé'
         );

         return res.redirect('/forgot-password');
      }
      console.log(user);
      const resetToken =
         user.createPasswordResetToken();

      await user.save({
         validateBeforeSave: false
      });

    //   console.log('TOKEN BRUT :', resetToken);
    //  console.log('TOKEN HASH DB :', user.resetPasswordToken);
    //  console.log('EXPIRE :', user.resetPasswordExpires);

      const resetURL =
         `http://localhost:3000/reset-password/${resetToken}`;

          await sendEmail(
             user.email,
           'Réinitialisation du mot de passe',
           `
              <h2>Réinitialisation du mot de passe</h2>

              <p>
                Clique sur le lien ci-dessous
                pour définir un nouveau mot de passe :
              </p>

              <a href="${resetURL}"
                style="
                    display:inline-block;
                    padding:12px 20px;
                    background:black;
                    color:white;
                    text-decoration:none;
                    border-radius:6px;
                "
              >
                Réinitialiser le mot de passe
              </a>

              <p>
                Ce lien expire dans 10 minutes.
              </p>
          `
        );

      req.flash(
         'success',
         'Lien envoyé par email'
      );

      return res.redirect('/forgot-password?success=true');

   } catch(err) {

      console.log(err);

      req.flash(
         'error',
         'Erreur serveur'
      );

      return res.redirect('/forgot-password');
   }
}


exports.resetPassword = async (req, res) => {

   try {
        
      const hashedToken = crypto
         .createHash('sha256')
         .update(req.params.token)
         .digest('hex');

      const user = await User.findOne({
         resetPasswordToken: hashedToken,
         resetPasswordExpires: {
            $gt: Date.now()
         }
      });

      if (!user) {

         req.flash(
            'error',
            'Token invalide ou expiré'
         );

         return res.redirect('/forgot-password');
      }

      if (req.body.password !== req.body.passwordConfirm) {

         req.flash(
            'error',
            'Les mots de passe ne correspondent pas'
         );

         return res.redirect('back');
      }

      user.password = req.body.password;
      user.passwordConfirm = req.body.passwordConfirm;
      user.passwordChangedAt = Date.now()

      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;


      await user.save();

       res.clearCookie('jwt')
       req.session.destroy(err => {
           if(err) {
             console.log(err)
           }

      return res.render('reset-password', {
          title: 'Réinitialiser le mot de passe',
          token: req.params.token,
          successPopup: true
          });
       })

   } catch(err) {

      console.log(err);

      req.flash(
         'error',
         'Erreur serveur'
      );

      return res.redirect('/forgot-password');
   }
}


exports.updateProfilePhoto = async (req, res) => {
   try {
        if(!req.file) {
          req.flash('error', 'Veuillez sélectionner une image');
          return res.redirect('/account');
        }

        const user = await User.findById(req.user._id)
        const oldPhoto = user.profileImage
        const filename = `user-${req.user._id}-${Date.now()}.jpeg`;

        await sharp(req.file.buffer)
          .resize(300, 300)
          .toFormat('jpeg')
          .jpeg({quality: 90})
          .toFile(path.join(__dirname, `../public/img/users/${filename}`));

        // Mise à jour directe dans la base de données
        await User.findByIdAndUpdate(req.user._id, { profileImage: filename });

         if(oldPhoto && oldPhoto !== 'default.png') {
           const oldPath = path.join(__dirname, `../public/img/users/${oldPhoto}`);
              fs.unlink(oldPath, (err) => {
                if (err) console.log("Erreur lors de la suppression de l'ancienne photo :", err);
                else console.log("Ancienne photo supprimée :", oldPhoto);
            });
         }

        req.flash('success', 'Photo mise à jour');
        res.redirect('/account');

   } catch(err) {
     console.log("Erreur :", err);
     res.status(500).send('Erreur serveur');
   }
};


