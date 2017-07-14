'use strict';

if (!global._babelPolyfill) require('babel-polyfill');
import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import path from 'path';
import runSequence from 'run-sequence';
import childProcess from 'child_process';
import delay from 'delay';

const $ = gulpLoadPlugins();
let NODE_ENV = process.env.NODE_ENV ? process.env.NODE_ENV : 'production';
NODE_ENV = process.argv.includes('--dev') ? 'development' : NODE_ENV;

gulp.task('default', ['clean'], () => {
  return new Promise((resolve, reject) => {
    runSequence([
      'copy',
      'vulcanize'
    ], resolve);
  });
});

gulp.task('babel', () => {
  return new Promise((resolve, reject) => {
    gulp.src([
      './src/**/*.{js,html}',
      '!./bower_components/**/*'
    ]).pipe($.if('*.html', $.crisper({})))
    // .pipe($.if('*.js', $.eslint()))
    // .pipe($.if('*.js', $.eslint.format()))
    // .pipe($.if('*.js', $.eslint.failAfterError()))
      .pipe($.if('*.js', $.babel({
        presets: [
          ['es2015', { modules: false }],
          'stage-2'
        ],
        plugins: ['babel-plugin-transform-async-to-generator']
      })))
      .pipe(gulp.dest('./.tmp/'))
      .on('end', resolve).on('error', reject);
  });
});

gulp.task('vulcanize', ['babel'], () => {
  return new Promise((resolve, reject) => {
    gulp.src('./.tmp/module.html')
      .pipe($.vulcanize({
        stripComments: true,
        inlineCss: true,
        inlineScripts: true
      }).on('error', reject))
      .pipe($.crisper({
        alwaysWriteScript: true
      }))
      .pipe($.if('*.js', $.uglify().on('error', reject)))
      .pipe($.if('*.html', $.htmlmin({
        collapseWhitespace: true,
        collapseInlineTagWhitespace: true,
        minifyJS: true,
        minifyCSS: true,
        removeStyleLinkTypeAttributes: true,
        removeScriptTypeAttributes: true,
        removeComments: true,
        removeAttributeQuotes: true
      })))
      .pipe(gulp.dest('./dist/'))
      .on('end', () => {
        gulp.src('./.tmp', { read: false })
          .pipe($.clean());
        resolve();
      });
  });
});

gulp.task('copy', () => {
  return new Promise((resolve, reject) => {
    gulp.src('./bower.json')
      .pipe(gulp.dest('./dist/'))
      .on('error', reject).on('end', resolve);
  });
});

gulp.task('clean', () => {
  return gulp.src([
    './dist',
    './.tmp'
  ], { read: false })
    .pipe($.clean());
});

gulp.task('serve', async (cb) => {
  new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log('Listening at http://localhost:8081');
    }, 2000);
    childProcess.spawn(`docker run --name some-blogdown --rm -p 8081:8081 \
-v ${path.resolve(__dirname)}/src/:/app/content/themes/some-theme \
      thingdown/blogdown:latest`, {
        stdio: 'inherit',
        shell: true
      }).on('close', resolve).on('error', reject);
  });
  return new Promise(async (resolve, reject) => {
    await delay(1000);
    childProcess.spawn(`docker cp ${path.resolve(__dirname)}/settings.json \
      some-blogdown:/app/content/settings.json`, {
        stdio: 'inherit',
        shell: true
      }).on('close', resolve).on('error', reject);
  });
});
