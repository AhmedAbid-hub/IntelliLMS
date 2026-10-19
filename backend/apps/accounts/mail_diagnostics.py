"""Safe SMTP failure categories. Never format provider exception bodies."""
import smtplib
import socket
import ssl


def failure_category(exc):
    if isinstance(exc, smtplib.SMTPAuthenticationError):
        return "authentication_rejected"
    if isinstance(exc, ssl.SSLError):
        return "tls_failed"
    if isinstance(exc, (TimeoutError, socket.timeout)):
        return "connection_timeout"
    if isinstance(exc, smtplib.SMTPRecipientsRefused):
        return "recipient_rejected"
    if isinstance(exc, smtplib.SMTPSenderRefused):
        return "sender_rejected"
    if isinstance(exc, smtplib.SMTPNotSupportedError):
        return "smtp_feature_unsupported"
    if isinstance(exc, smtplib.SMTPServerDisconnected):
        return "connection_failed"
    if isinstance(exc, smtplib.SMTPException):
        return "smtp_rejected"
    if isinstance(exc, OSError):
        return "connection_failed"
    return "mail_configuration_or_backend_error"
