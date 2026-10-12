package com.branchstock.web;

public class ApiException extends RuntimeException {
    public ApiException(String message) {
        super(message);
    }
}
