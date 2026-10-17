FROM python:3.14-slim
# The lesson executor has no network. Install teaching libraries at image build.
RUN pip install --no-cache-dir SQLAlchemy==2.1.4 pytest==9.1.1
ENV PYTEST_DISABLE_PLUGIN_AUTOLOAD=1
