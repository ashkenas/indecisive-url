const express = require('express');
const redis = require('redis');
const { createCanvas } = require('canvas');
const { commandOptions } = require('redis');

const perIp = false;

const app = express();
const redisClient = redis.createClient();

const canvas = createCanvas(220, 40);
const ctx = canvas.getContext('2d');
ctx.font = '30px Arial';

const sync = f => (req, res, next) => f(req, res, next).catch(next);

app.get('*',
  (req, res, next) => {
    if (req.get('X-Forwarded-For')) {
      req.source = req.get('x-forwarded-for').split(',')[1].trim();
    } else {
      req.source = req.ip;
    }
    next();
  },
  sync(async (req, res, next) => {
    let equation;
    if (perIp) {
      equation = await redisClient.hGet('indecisive-url-equations', req.source);
    } else {
      const c = Math.floor(Math.random()*7+3);
      const b = Math.floor(Math.random()*7+3);
      const a = Math.floor(Math.random()*7+3) * b;
      equation =`${a}/${b}+${c}`;
    }
    if (equation) {
      const image = await redisClient.hGet(
        commandOptions({ returnBuffers: true }),
        'indecisive-url-images',
        equation
      );
      if (!image) return next();
      res.set('Content-Type', 'image/png');
      return res.send(image);
    }
    next();
  }),
  sync(async (req, res) => {
    const c = Math.floor(Math.random()*7+3);
    const b = Math.floor(Math.random()*7+3);
    const a = Math.floor(Math.random()*7+3) * b;
    const equation =`${a}/${b}+${c}`;
    await redisClient.hSet('indecisive-url-equations', req.source, equation);
    const image = await redisClient.hGet(
      commandOptions({ returnBuffers: true }),
      'indecisive-url-images',
      equation
    );
    res.set('Content-Type', 'image/png');
    if (image) return res.send(image);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.fillText(`${a} / ${b} + ${c} = ?`, 5, 32);
    const url = canvas.toDataURL('image/png');
    const data = Buffer.from(url.split(',')[1], 'base64');
    await redisClient.hSet('indecisive-url-images', equation, data);
    res.send(data);
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
