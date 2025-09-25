"""
Setup script for Almona Industrial API Python SDK
"""

from setuptools import setup, find_packages
import os

# Read the README file
def read_readme():
    with open(os.path.join(os.path.dirname(__file__), 'README.md'), 'r', encoding='utf-8') as f:
        return f.read()

# Read requirements
def read_requirements():
    with open(os.path.join(os.path.dirname(__file__), 'requirements.txt'), 'r', encoding='utf-8') as f:
        return [line.strip() for line in f if line.strip() and not line.startswith('#')]

setup(
    name="almona-industrial-api",
    version="2.0.0",
    author="Almona Industrial",
    author_email="api-support@almona.com",
    description="Python SDK for Almona Industrial API",
    long_description=read_readme(),
    long_description_content_type="text/markdown",
    url="https://github.com/almona/industrial-api-client-python",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Internet :: WWW/HTTP :: Dynamic Content",
        "Topic :: Office/Business",
    ],
    python_requires=">=3.8",
    install_requires=read_requirements(),
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-asyncio>=0.21.0",
            "pytest-cov>=4.0.0",
            "black>=23.0.0",
            "isort>=5.12.0",
            "flake8>=6.0.0",
            "mypy>=1.0.0",
            "pre-commit>=3.0.0",
        ],
        "async": [
            "aiohttp>=3.8.0",
        ],
    },
    keywords=[
        "almona",
        "industrial",
        "api",
        "client",
        "sdk",
        "python",
        "machinery",
        "maintenance",
        "tickets",
        "quotes"
    ],
    project_urls={
        "Bug Reports": "https://github.com/almona/industrial-api-client-python/issues",
        "Source": "https://github.com/almona/industrial-api-client-python",
        "Documentation": "https://docs.almona.com/api/python",
        "Homepage": "https://almona.com",
    },
    include_package_data=True,
    zip_safe=False,
)
