const Koa = require('koa');
const koaBody = require('koa-body');
const router = require('koa-router')();
const logger = require('koa-logger');
const http = require('http');
const db = require('./lib/db');
const iconv = require('iconv-lite');

config = require('./config.json');

const app = new Koa();
const Buffer = require('buffer').Buffer;

app.use(logger());
app.use(koaBody());

function badEncoding(s) {
    return iconv.encode(iconv.decode(new Buffer(decodeURIComponent(unescape(s)), 'binary'), 'win1251'), 'utf8').toString();
}

const getContent = function (url) {
    // return new pending promise
    return new Promise((resolve, reject) => {
        // select http or https module, depending on reqested url
        const lib = url.startsWith('https') ? require('https') : require('http');
        const request = lib.get(url, (response) => {
            // handle http errors
            if (response.statusCode < 200 || response.statusCode > 299) {
                reject(new Error('Failed to load page, status code: ' + response.statusCode));
            }
            // temporary data holder
            const body = [];
            // on every content chunk, push it to the data array
            response.on('data', (chunk) => body.push(chunk));
            // we are done, resolve promise with those joined chunks
            response.on('end', () => resolve(body.join('')));
        });
        // handle connection errors of the request
        request.on('error', (err) => reject(err))
    })
};

router
    .get('/ua', async (ctx, next) => {
        // ua

        var query = ctx.request.query;

        if (typeof query.ua == 'undefined') {
            ctx.status = 400;
            ctx.body = JSON.stringify({
                status: 'error',
                errorId: '1',
                body: 'Not set key'
            });
            console.log(ctx.body);
            return;
        }

        if (query.ua == '') {
            ctx.status = 400;
            ctx.body = JSON.stringify({
                status: 'error',
                errorId: '1',
                body: 'Not set key'
            });
            console.log(ctx.body);
            return;
        }



        try {
            var result = await db.query('SELECT browser, os, device FROM ua WHERE ua = {ua} LIMIT 1', {
                ua: query.ua,
            });
        } catch (err) {
            console.log(err);
            ctx.status = 400;
            ctx.body = JSON.stringify({
                status: 'error',
                errorId: '1',
                body: 'Incorrect key'
            });
            console.log(ctx.body);
            return;
        }

        if (result.length) {
            ctx.status = 200;
            ctx.body = JSON.stringify({
                status: 'ok',
                result: result
            });

            return;
        }


        ctx.status = 200;
        ctx.body = JSON.stringify({
            status: 'not'
        });

        return;
    })
    .post('/ua', async (ctx, next) => {
        // ua

        var query = ctx.request.query;

        console.log(query);

        if (typeof query.ua == 'undefined') {
            ctx.status = 400;
            ctx.body = JSON.stringify({
                status: 'error',
                errorId: '1',
                body: 'Not set key'
            });
            console.log(ctx.body);
            return;
        }

        if (query.ua == '') {
            ctx.status = 400;
            ctx.body = JSON.stringify({
                status: 'error',
                errorId: '1',
                body: 'Not set key'
            });
            console.log(ctx.body);
            return;
        }

        try {
            var result = await db.query('INSERT INTO `ua` (`ua`) VALUES ({ua})', {
                ua: query.ua,
            });
        } catch (err) {
            console.log(err);
            ctx.status = 400;
            ctx.body = JSON.stringify({
                status: 'error',
                errorId: '1',
                body: 'Incorrect key'
            });
            console.log(ctx.body);
            return;
        }

        ctx.status = 200;
        ctx.body = JSON.stringify({
            status: 'ok'
        });

        return;
    })
    .get('/update', async (ctx, next) => {
        // ua

        let uaList = await db.query('SELECT id, ua FROM ua WHERE userstack != 1 OR userstack IS NULL');

        for (const item of uaList) {
            let res = await getContent(`http://api.userstack.com/detect?access_key=${config.userstack_key}&ua=${item.ua}`);
            let api_response = JSON.parse(res);

            // console.log(api_response);

            await db.query('UPDATE `ua` SET \
                `type` = {type}, \
                `os_name` = {os_name}, \
                `os_code` = {os_code}, \
                `os_family` = {os_family}, \
                `os_family_code` = {os_family_code}, \
                `os_family_vendor` = {os_family_vendor}, \
                `os_icon` = {os_icon}, \
                `os_icon_large` = {os_icon_large}, \
                `device_is_mobile_device` = {device_is_mobile_device}, \
                `device_type` = {device_type}, \
                `device_brand` = {device_brand}, \
                `device_brand_code` = {device_brand_code}, \
                `device_name` = {device_name}, \
                `browser_name` = {browser_name}, \
                `browser_version` = {browser_version}, \
                `browser_version_major` = {browser_version_major}, \
                `browser_engine` = {browser_engine}, \
                `userstack` = {userstack} \
                WHERE (`id`={id}) LIMIT 1;', {
                id: item.id,
                type: api_response.type,
                os_name: api_response.os.name,
                os_code: api_response.os.code,
                os_family: api_response.os.family,
                os_family_code: api_response.os.family_code,
                os_family_vendor: api_response.os.family_vendor,
                os_icon: api_response.os.icon,
                os_icon_large: api_response.os.icon_large,
                device_is_mobile_device: api_response.device.is_mobile_device ? 1 : 0,
                device_type: api_response.device.type,
                device_brand: api_response.device.brand,
                device_brand_code: api_response.device.brand_code,
                device_name: api_response.device.name,
                browser_name: api_response.browser.name,
                browser_version: api_response.browser.version,
                browser_version_major: api_response.browser.version_major,
                browser_engine: api_response.browser.engine,
                userstack: 1,
            });

        }




        

        ctx.status = 200;
        ctx.body = JSON.stringify({
            status: 'ok'
        });

        // try {
        //     
        // } catch (err) {
        //     console.log(err);
        //     ctx.status = 400;
        //     ctx.body = JSON.stringify({
        //         status: 'error',
        //         errorId: '1',
        //         body: 'Incorrect key'
        //     });
        //     console.log(ctx.body);
        //     return;
        // }

        // ctx.status = 200;
        // ctx.body = JSON.stringify({
        //     status: 'ok'
        // });

        return;
    });

app.use(router.routes());

app.listen(3100);