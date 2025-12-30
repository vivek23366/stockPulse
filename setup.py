from setuptools import setup, find_packages

setup(
    name="stock-pulse",
    version="1.0.0",
    description="A terminal dashboard for stock market data",
    author="Sushant Dagar",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[
        "yfinance>=0.2.36",
        "pandas>=2.0.0",
        "colorama>=0.4.6",
    ],
    extras_require={
        "dev": [
            "pytest>=7.4.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "stock-pulse=main:main",
        ],
    },
)
