import logging
import sys

def setup_logger(name="resume-parser"):
    """Configure and return logger."""
    logger = logging.getLogger(name)
    
    # If the logger already has handlers, skip configuration
    if logger.handlers:
        return logger
        
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[logging.StreamHandler(sys.stdout)]
    )
    
    return logger