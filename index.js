const express = require('express');
const redis = require('redis');

const redisClient = redis.createClient();
const app = express();

const sync = f => (req, res, next) => f(req, res, next).catch(next);

app.get('*',
  sync(async (req, res, next) => {
    const cached = await redisClient.hGet('indecisive-url', req.ip);
    if (cached) return res.send(cached);
    next();
  }),
  sync(async (req, res) => {

  })
);

app.use('*', (_, res) => res.status(404).send('Not Found'));

app.use((_, __, res, ___) => res.status(500).send('Internal Server Error'));

redisClient.connect().then(() => {
  app.listen(process.env.PORT || 6284, () => {
    console.log('Online.');
  });
}).catch(e => {
  console.error(e);
});
