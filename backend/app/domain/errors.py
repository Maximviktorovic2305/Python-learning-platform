"""Application failures independent of HTTP and persistence adapters."""


class ApplicationError(Exception):
    pass


class AuthenticationRequired(ApplicationError):
    pass


class ResourceNotFound(ApplicationError):
    pass


class PermissionDenied(ApplicationError):
    pass


class InvalidRequest(ApplicationError):
    pass


class UnprocessableInput(ApplicationError):
    pass


class Conflict(ApplicationError):
    pass


class DependencyUnavailable(ApplicationError):
    pass
