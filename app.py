from flask import Flask, render_template
from flask.ext.frozen import Freezer
import os.path
import sys
import random

# create app
app = Flask(__name__)
app.config['DEBUG'] = True
app.config['FREEZER_BASE_URL'] = '/sei'
app.config['FREEZER_DESTINATION'] = os.path.join('build', app.config['FREEZER_BASE_URL'][1:])

# create freezer
freezer = Freezer(app, with_static_files=False)

# variable
random_url_version = str(random.randrange(1,1000000))

# add views
@app.route('/')
def index():
    return render_template('index.html')

# @app.route('/theory.html')
# def theory():
#     return render_template('theory.html')

@app.route('/setup.html')
def setup():
    return render_template('setup.html')

@app.route('/simulation.html')
def simulation():
    return render_template('simulation.html')

# @app.route('/calibration.html')
# def calibration():
#     return render_template('calibration.html')

# @app.route('/optimization.html')
# def optimization():
#     return render_template('optimization.html')

# @app.route('/export.html')
# def export():
#     return render_template('export.html')

# filters
@app.template_filter('random_url')
def random_url(s):
    return s + '?' + random_url_version

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'build':
        freezer.freeze()
    else:
        app.run()
