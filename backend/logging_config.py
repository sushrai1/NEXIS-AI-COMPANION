# logging_config.py

import logging.config
import os

# --- Configuration ---
LOGS_DIR = "logs" # Directory to store log files
LOG_FILENAME = "nexis_app.log" # Name of the log file
LOG_FILE_PATH = os.path.join(LOGS_DIR, LOG_FILENAME)

# Create logs directory if it doesn't exist
os.makedirs(LOGS_DIR, exist_ok=True)
# Create the log file if it doesn't exist, needed for file handler
if not os.path.exists(LOG_FILE_PATH):
    open(LOG_FILE_PATH, 'a').close()

# --- Logging Dictionary Configuration ---
# Uses Python's standard dictConfig format
LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False, # Keep default loggers (like uvicorn/fastapi)
    "formatters": {
        "standard": {
            "format": "%(asctime)s - %(name)s:%(lineno)d - %(levelname)s - %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
        "simple": {
            "format": "%(levelname)s - %(message)s",
        },
    },
    "handlers": {
        "console": {
            "level": "INFO", # Log INFO and above to console (DEBUG, INFO, WARNING, ERROR, CRITICAL)
            "class": "logging.StreamHandler",
            "formatter": "simple",
            "stream": "ext://sys.stdout", # Send to standard output
        },
        "file": {
            "level": "DEBUG", # Log DEBUG and above to the file
            "class": "logging.handlers.RotatingFileHandler",
            "formatter": "standard",
            "filename": LOG_FILE_PATH,
            "maxBytes": 10485760, # 10MB
            "backupCount": 5, # Keep 5 backup log files
            "encoding": "utf8",
        },
    },
    "loggers": {
        # Root logger: catches everything not handled by specific loggers
        "": {
            "handlers": ["console", "file"],
            "level": "DEBUG", # Lowest level to capture everything (handlers filter later)
            "propagate": False, # Prevent root logger messages from propagating to higher levels
        },
        # Specific logger for your application module(s)
        "nexis_app": { # Replace 'nexis_app' with your main app's module name if different
            "handlers": ["console", "file"],
            "level": "DEBUG",
            "propagate": False, # Don't send these logs to the root logger too
        },
        # Control logging levels for noisy third-party libraries if needed
        "uvicorn.error": {
            "handlers": ["console", "file"],
            "level": "INFO", # Example: Only show INFO+ from uvicorn errors
            "propagate": False,
        },
         "uvicorn.access": {
            "handlers": ["console", "file"],
            "level": "INFO", # Example: Only show INFO+ for access logs
            "propagate": False,
        },
    },
}

def setup_logging():
    """Applies the logging configuration."""
    logging.config.dictConfig(LOGGING_CONFIG)
    logger = logging.getLogger(__name__)
    logger.info("Logging configured successfully.")