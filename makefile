all:
	python app.py build
	node r.js -o static/js/app.build.js

clean:
	rm -rf build