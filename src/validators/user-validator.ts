import Joi, { CustomHelpers } from 'joi';

const validateUserName = (value: string, helpers: CustomHelpers<string>) => {
  // Split the name into words
  const words = value.split(/\s+/);

  // Check if there are exactly two words
  if (words.length < 2) {
    // Set a custom error message if validation fails
    return helpers.error('string.base', { message: 'Please enter your first and last names.' });
  }
  return value;
};

const registerSchema = Joi.object({
  full_name: Joi.string()
    .pattern(new RegExp("[a-zA-Z'-\\s]+$"))
    .required()
    .min(3)
    .max(30)
    .custom(validateUserName, 'Please enter your first and last names.')
    .messages({
      'string.base': `Please enter your first and last names. They can only contain [a-z, A-Z, ' and -].`,
      'string.empty':
        "Please enter your first and last names. They can only contain [a-z, A-Z, ' and -].",
      'any.invalid': `Please enter your first and last names. They can only contain [a-z, A-Z, ' and -].`
    }),
  email: Joi.string()
    .email({
      minDomainSegments: 2,
      tlds: { allow: ['com', 'net'] }
    })
    .messages({
      'string.email': `Please provide a valid email.`
    })
    .required(),
  phone_number: Joi.string().pattern(new RegExp('^[0-9]{11}$')).required().messages({
    'string.pattern.base': `Please provide a valid phone number.`
  }),
  password: Joi.string()
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)
    .required()
    .messages({
      'string.pattern.base':
        'Password must be between 8 and 30 characters long and include at least one of [a-z, A-Z, 0-9]'
    }),
  password_confirm: Joi.valid(Joi.ref('password')).messages({
    'any.only': 'Passwords do not match. Please make sure the passwords match.'
  })
});

const updatePasswordSchema = Joi.object({
  password: Joi.string()
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)
    .required()
    .messages({
      'string.pattern.base':
        'Password must be between 8 and 30 characters long and include at least one of [a-z, A-Z, 0-9]'
    }),
  password_current: Joi.string().required().messages({
    'string.base': 'Please provide your current password.',
    'string.empty': 'Please provide your current password.'
  })
});

export { registerSchema, updatePasswordSchema };
