import Joi from 'joi';

const registerSchema = Joi.object({
  package_name: Joi.string()
    .pattern(new RegExp("[a-zA-Z'-\\s]+$"))
    .required()
    .min(3)
    .max(30)
    .messages({
      'string.base': `Please enter your first and last names. They can only contain [a-z, A-Z, ' and -].`,
      'string.pattern.base': `"Please enter your first and last names. They can only contain [a-z, A-Z, ' and -].`,
      'string.empty':
        "Please enter your first and last names. They can only contain [a-z, A-Z, ' and -].",
      'any.invalid': `Please enter your first and last names. They can only contain [a-z, A-Z, ' and -].`
    }),

  pick_up_date: Joi.date().required().iso().min('now').raw().messages({
    'date.base': `Please provide a valid email.`,
    'date.min': 'The pick-up date has to be today or later.'
  }),

  receiver_email: Joi.string()
    .email({
      minDomainSegments: 2,
      tlds: { allow: ['com', 'net'] }
    })
    .messages({
      'string.email': `Please provide a valid email.`
    })
    .required(),

  pickup_location_coordinates: Joi.array()
    .ordered(Joi.number().required().min(-90).max(90), Joi.number().required().min(-180).max(180))
    .length(2)
    .required(),

  destination_coordinates: Joi.array()
    .ordered(Joi.number().required().min(-90).max(90), Joi.number().required().min(-180).max(180))
    .length(2)
    .required(),

  destination_address: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required()
  }),

  pick_up_address: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required()
  }),

  receiver_phone_number: Joi.string().pattern(new RegExp('^[0-9]{11}$')).required().messages({
    'string.pattern.base': `Please provide a valid phone number.`
  }),
  description: Joi.string().required().messages({
    'string.base': `Please provide a description the package.`,
    'string.empty': 'Please provide a description the package.',
    'any.invalid': `Please provide a description the package.`
  })
});

const packageTrackingSchema = Joi.object({
  package_id: Joi.string().guid({ version: 'uuidv4' }).required().messages({
    'any.required': 'Package tracking ID is required',
    'string.guid': 'Package tracking ID is invalid, please check and try again.'
  }),
  tracking_password: Joi.string().optional()
});

export { registerSchema, packageTrackingSchema };
