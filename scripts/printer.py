import subprocess
import os

from flask import Flask
from werkzeug.utils import secure_filename
from flask_restful import Api, Resource, request

import logging
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

app = Flask(__name__)
api = Api(app)

app.config['MAX_CONTENT_LENGTH'] = 16 * 1000 * 1000
app.config['UPLOAD_FOLDER'] = os.path.join('data', 'uploads')

@api.resource('/print')
class Print(Resource):
    def post(self):
        file = request.files['file']
        if file.filename == '':
            return {'error': 'No file selected'}, 400

        if file:
            filename = secure_filename(file.filename)
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            subprocess.Popen(f'lpr -o media=A4 -o prettyprint -o fit-to-page '
                             f'{os.path.join(app.config["UPLOAD_FOLDER"], filename)}', shell=True)
            return {'success': True}, 200
        else:
            return {'error': 'No file selected'}, 400

# Get the IP address from arguments
import argparse
parser = argparse.ArgumentParser()
parser.add_argument('ip', help='IP address of the printer')
parser.add_argument('port', help='Port of the printer')
args = parser.parse_args()

# Run the server
app.run(host=args.ip, port=args.port, debug=False)
