# Validata: RDF Validator using Shape Expressions
Validata is an intuitive, standalone web-based tool to help building RDF documents by validating against preset schemas written in the Shape Expressions (ShEx) language.  

All functionality is implemented client-side, so it can be deployed in any web hosting environment with any web server which can serve static files.  

The actual validation task is performed by code from the [ShEx-validator](https://github.com/HW-SWeL/ShEx-validator) project. The Node.js module from that project is then packaged for client-side usage using Browserify, as detailed below.  

##Requirements for deployment setup:
* Node.js / NPM
* Bower

Installing Node.js (which includes the npm package manager) is easy on Windows and Mac with the https://nodejs.org installer.

On Linux I'd recommend installing it using your distribution's package manager, however as it isn't in the standard repositories you should follow these instructions (only a couple of commands for most distros) to install:
https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager  

After installing Node.js, make sure you have the latest version of npm by telling it to update itself:  
```sudo npm install npm -g```  

Once you have NPM installed, install bower globally:  
```
npm install -g bower
```  

Bower is a very handy package manager, better equipped for front end web development than NPM alone: http://bower.io  


##Validata deployment quick start guide:  

Clone the repository to a new folder. The static web application will be served from the "public" subfolder of this folder.  
```git clone git@github.com:HW-SWeL/Validata.git ShExValidataAndrew```

Move into the project folder and update NPM packages and Bower packages:  
```cd ShExValidataAndrew```  
```npm install```  
```bower install```  

To deploy a Validata instance place the files in /public in your web root.

Congratulations, your Validata deployment should now be up and running!  

###Custom Configurations
Next, you might want to create a custom configuration for your deployment of Validata, with your own schemas and demo data etc.   
To do this, load up your deployed web application with "/admin" appended to the root URL to access the Validata admin application. This is a simple tool designed to help you generate a JSON configuration file for the main Validata deployment.
You can either start by uploading/importing the default config file from /public/javascripts/ValidataConfig.json, or you can start creating your own from scratch by adding a schema.  
Hopefully the admin generator is fairly self-explanatory - once you're finished, click Download File to save your new ValidataConfig.json configuration file.   
Then, upload this file to the /public/javascripts folder of your deployment location, overwriting the existing configuration file, and your new settings will immediately be live.  

##Issue tracking  
If something isn't working right or isn't explained well enough above, please feel free to post an issue on the GitHub project [issue tracker!](https://github.com/HW-SWeL/Validata/issues)  

##Validata and ShExValidator Developement

Any time the ShEx-validator code is modified in ```/node_modules/ShEx-validator``` (by either modifying it directly for testing, or by committing to the ShEx-validator project and running ```npm update``` in your Validata root, you'll need to re-browserify your packaged version of it.

This requires that browserify is deployed, which can be done with the following command
```
npm install -g broswerify
```
The latest version of the ShEx-validator validation library can be packaged into a client-side javascript file using browserify:  
```browserify public/javascripts/ShExValidator-browserify.js -o public/javascripts/ShExValidator.js```  
