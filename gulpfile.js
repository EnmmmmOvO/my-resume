const gulp = require('gulp');
const path = require('path');
const fs = require('fs');
const matter = require('gray-matter');
const yaml = require('js-yaml');
const MarkdownIt = require('markdown-it');
const markdownItAttrs = require('markdown-it-attrs');
const nib = require('nib');
const $ = require('gulp-load-plugins')();
const browserSync = require('browser-sync').create();

const isProd = process.env.NODE_ENV === 'production';

const md = new MarkdownIt({
  html: true,
  breaks: true,
  typographer: true
});
md.use(markdownItAttrs);

const paths = {
  root: path.join(__dirname, '../'),
  src: path.join(__dirname, '../src/'),
  scripts: 'src/scripts/*.js',
  styles: 'src/styles/**/*.styl',
  assets: path.join(__dirname, '../src/assets'),
};

function fonts() {
  return gulp.src(['node_modules/font-awesome/fonts/fontawesome-webfont.*'])
    .pipe(gulp.dest('dist/fonts/'))
    .pipe($.size());
}

function scripts() {
  return gulp.src([
      'node_modules/jquery/dist/jquery.min.js',
      'node_modules/velocity-animate/velocity.js',
      paths.scripts
    ])
    .pipe($.uglify())
    .pipe($.concat({ path: 'scripts.js', stat: { mode: 0666} }))
    .pipe(gulp.dest('dist/assets/'))
    .pipe($.size());
}

function styles() {
  return gulp.src([
      'node_modules/font-awesome/css/font-awesome.min.css',
      paths.styles
    ])
    .pipe($.stylus({ use: nib(), compress: true, import: ['nib']}))
    .pipe($.autoprefixer({
      browsers: ['last 2 versions'],
      cascade: false
    }))
    .pipe($.concat({ path: 'styles.css', stat: { mode: 0666} }))
    .pipe(gulp.dest('dist/assets/'))
    .pipe($.size());
}

function readYaml(file, schema) {
  return matter(fs.readFileSync(file, 'utf8'), { schema }).data;
}

function html(done) {
  const MarkdownType = new yaml.Type('tag:yaml.org,2002:md', {
    kind: 'scalar',
    construct: function (text) {
      return md.render(text);
    },
  });
  const YAML_SCHEMA = yaml.Schema.create([MarkdownType]);
  const context = readYaml('data.yaml', YAML_SCHEMA);
  const contextEn = readYaml('data_en.yaml', YAML_SCHEMA);

  // 处理中文模板
  return gulp.src(['template/index.html', 'template/print.html'])
    .pipe($.nunjucks.compile(context))
    .pipe($.htmlmin({collapseWhitespace: true}))
    .pipe(gulp.dest('dist'))
    .pipe($.size())
    .on('end', () => {
      // 处理英文模板
      gulp.src(['template_en/index_en.html', 'template_en/print_en.html'])
        .pipe($.nunjucks.compile(contextEn))
        .pipe($.htmlmin({collapseWhitespace: true}))
        .pipe(gulp.dest('dist'))
        .pipe($.size())
        .on('end', done);  // 通知 Gulp 任务完成
    });
}

function watchFiles() {
  if (!isProd) {
    browserSync.init({
      server: "./dist"
    });
  }
  gulp.watch(paths.scripts, scripts);
  gulp.watch(paths.styles, styles);
  gulp.watch(['template/*.html', 'template_en/*.html', 'data.yaml', 'data_en.yaml'], html);
  gulp.watch(["dist/*.html", "dist/assets/*.*"]).on('change', browserSync.reload);
}

const build = gulp.parallel(scripts, styles, fonts, html);
const watch = gulp.series(build, watchFiles);

exports.fonts = fonts;
exports.scripts = scripts;
exports.styles = styles;
exports.html = html;
exports.watch = watch;
exports.default = watch;
