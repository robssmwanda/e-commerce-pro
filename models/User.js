const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')


const userSchema = new mongoose.Schema({
   firstname: {
     type: String,
     required: [true, 'You must provide your firstName'],
   },

   lastname: {
     type: String,
     required: [true, 'You must provide your latsName'],
   },

  email: {
    type: String,
    required: [true, 'You must provide your email.'],
    unique: true,
    lowercase: true,
    trim: true
  },
  
  password: {
    type: String,
    required: [true, 'You must provide your password'],
    minLength: [5, 'Password must be at least 5 caracters'],
    maxLength: [14, 'Password cannot be more than 14 caracters long'],
    select: false
  },

  passwordConfirm: {
    type: String,
    validate: {
      validator: function(el){
        return el === this.password
      },
      message: 'Password do not mutch'
    }
  },

  phoneNumber: {
    type: String,
    default: ''
  },
  recoveryEmail: {
    type: String,
    default: ''
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  country: {
    type: String,
    required: [true, 'Please provide your country']
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  profileImage: {
    type: String,
    default: 'default.png'
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Please provide your date of birth']
  },
  cart: {
  items: [
    {
      product: {
        type: mongoose.Schema.ObjectId,
        ref: 'Product',
        required: true
      },
      quantity: {
        type: Number,
        default: 1
      }
    }
  ]
 },
 
  resendCount: {
    type: Number,
    default: 0
  },
  resendLastSentAt: Date,
  resendBlockedUntil: Date,

  isVerified: {
    type: Boolean,
    default: false
  },
  passwordChangedAt: {
     type: Date,
     default: Date.now
  }, 
  verificationToken: String,
  verificationTokenExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,

}, {
  timestamps: true 
})

userSchema.pre('save', async function() {
   // 1) Ne s'excute que si le mot de passe a ete modifiee (ou cree)
   if(!this.isModified('password')) return 
   // 2) Hasher le mot de passe avec un cout de 12 
    this.password = await bcrypt.hash(this.password, 12)
   this.passwordConfirm = undefined;
   
})

userSchema.methods.correctPassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}


userSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    this.resetPasswordExpires = Date.now() + 10 * 60 * 1000;

    return resetToken;
}


const User = mongoose.model('User', userSchema)
module.exports = User