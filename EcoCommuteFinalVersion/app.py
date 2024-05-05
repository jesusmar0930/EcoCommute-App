

from flask import Flask, render_template, request, redirect, url_for, session
from flask_sqlalchemy import SQLAlchemy
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField
from wtforms.validators import DataRequired, Length
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask import jsonify
import os
from sqlalchemy.exc import IntegrityError
from dotenv import load_dotenv



load_dotenv()

app = Flask(__name__)
app.config['GOOGLE_MAPS_API_KEY'] = os.getenv('GOOGLE_MAPS_API_KEY')
app.config['SECRET_KEY'] = 'your-secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///ecocommute.db'
db = SQLAlchemy(app)

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)
    preferred_mode = db.Column(db.String(20), default='DRIVING')
    total_emissions = db.Column(db.Float, default=0.0)

class RegistrationForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired(), Length(min=4, max=50)])
    password = PasswordField('Password', validators=[DataRequired(), Length(min=6)])
    submit = SubmitField('Register')

class LoginForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    submit = SubmitField('Login')

@app.route('/')
def home():
    return render_template('index.html')

login_manager = LoginManager(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/get-preferred-mode')
@login_required
def get_preferred_mode():
    preferred_mode = current_user.preferred_mode
    return jsonify({'preferred_mode': preferred_mode})

@app.route('/save-preference', methods=['POST'])
@login_required
def save_preference():
    preferred_mode = request.form.get('prefMode')
    if preferred_mode:
        current_user.preferred_mode = preferred_mode
        db.session.commit()
    return redirect(url_for('home'))

@app.route('/update-emissions', methods=['POST'])
@login_required
def update_emissions():
    emissions = float(request.form.get('emissions', 0))
    current_user.total_emissions += emissions
    db.session.commit()
    return jsonify({'total_emissions': current_user.total_emissions})

@app.route('/register', methods=['GET', 'POST'])
def register():
    form = RegistrationForm()
    if form.validate_on_submit():
        hashed_password = generate_password_hash(form.password.data)
        new_user = User(username=form.username.data, password=hashed_password)
        db.session.add(new_user)
        try:
            db.session.commit()
            login_user(new_user)  # Log in the user after successful registration
            return redirect(url_for('home'))
        except IntegrityError:
            db.session.rollback()
            form.username.errors.append('Username already exists. Please choose a different one.')
    return render_template('register.html', form=form)


@app.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user and check_password_hash(user.password, form.password.data):
            login_user(user)  # Log in the user using Flask-Login
            return redirect(url_for('home'))
        else:
            form.username.errors.append('Invalid username or password.')
    return render_template('login.html', form=form)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('home'))

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)