const httpStatus = require('http-status');
const { find } = require('../queries');

const findHandler = async (req, res) => {
  try {
    const result = await find({
      model: req.model,
      paginate: {
        page: req.query.page,
        limit: req.query.limit,
        sort: req.query.sort,
      },
      depth: req.query.depth,
      locale: req.locale,
      fallbackLocale: req.query['fallback-locale'],
    });

    return res.status(httpStatus.OK).json(result);
  } catch (err) {
    return res.status(400).json(err);
  }
};

module.exports = findHandler;