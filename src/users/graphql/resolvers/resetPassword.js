/* eslint-disable no-param-reassign */
const { resetPassword } = require('../../operations');

const resetPasswordResolver = ({ Model, config }) => async (_, args, context) => {
  if (args.locale) context.locale = args.locale;
  if (args.fallbackLocale) context.fallbackLocale = args.fallbackLocale;

  const options = {
    Model,
    config,
    data: args,
    req: context,
  };

  const user = await resetPassword(options);

  return user;
};

module.exports = resetPasswordResolver;