# basyt
minimalist package to create JSON API server. Typical scenario to use basyt is when you need a rest-like JSON API that provides create/read/update/delete/query actions for your data entities.

[![npm version](https://badge.fury.io/js/basyt.svg)](http://badge.fury.io/js/basyt)
[![Build Status](https://travis-ci.org/ytlabs/basyt.svg)](http://travis-ci.org/ytlabs/basyt)
[![Dependencies](https://david-dm.org/ytlabs/basyt.svg)](https://david-dm.org/ytlabs/basyt)
[![Coverage Status](https://coveralls.io/repos/ytlabs/basyt/badge.svg?branch=master)](https://coveralls.io/r/ytlabs/basyt?branch=master)

## Installation

```bash
$ npm install basyt
$ npm install basyt-mongodb-collection
```

## Features
* is an extension over awesome nodejs framework expressjs
* generates CRUDL API and routing based on entities and controllers located in corresponding folders at the startup
* provides json web token based authentication
* provides redis based notification for entity updates
* provides user management and role based access control

Please review test folder, there you will find a sample web application exposing test\_entity and test\_relation entities.

## Documentation

[Project Wiki](https://github.com/ytlabs/basyt/wiki) is available for reference.

## Why do we call it basyt
In Turkish *basit* means *simple*. That is the motivation: an extension over expressjs to make things simpler. Since our company's initials are YT, we decided to call the project **basyt**, simple web package from Yonca Teknoloji.
