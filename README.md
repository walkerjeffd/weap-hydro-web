WEAP Hydrology Web App
======================

Interactive web application of the WEAP hydrology sub-model. This application adapts the backbone/d3/flask framework used for the Web-based Interactive Watershed Model (WIWM) application found [here](https://github.com/walkerjeffd/phd-abcd).

More information about WEAP can be found at [weap21.org](http://www.weap21.org/).

The hydrology model is defined in [Yates et al., 2005](http://www.weap21.org/downloads/WEAPDSS.pdf).

Build Instructions
==================

Create virtualenv and install python dependencies

```shell
virtualenv env
env\Scripts\activate.bat
pip install requirements.txt
```

Use make to freeze flask application and optimize the backbone application via [require.js](requirejs.org/docs/optimization.html):

```shell
make
```

A static collection of the HTML/CSS/JS are built in the `build/` directory. Note that this command currently puts these files in an `sei/` subfolder, which is then deployed to a webhost. The URLs all reflect this folder structure and can be changed in `app.py` and `static/js/app.build.js`.