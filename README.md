# Validata: RDF Validator using Shape Expressions
Validata is an intuitive, standalone web-based tool to help building RDF documents by validating against preset schemas written in the Shape Expressions (ShEx) language.

All functionality is implemented client-side, so it can be deployed in any web hosting environment which can serve static files.

Dependencies are managed using [bower](http://bower.io/) and configured using the bower.json file. To install bower simply enter
```
npm install -g bower
```
To retrieve all the dependencies enter
```
bower install
```

To deploy a Validata instance place the files in /public in your web root.

Once deployed, you'll most likely want to use the admin tool to generate a configuration file to suit your needs. This can be accessed at <deployment address>/admin and will generate a ShExValidataConfig.js file which you can then upload to /public/javascripts/

The actual validation task is performed by code from the [ShEx-validator](https://github.com/HeriotWattMEng2015/ShEx-validator) project. The NodeJS module from that project is then packaged for client-side usage using Browserify.
