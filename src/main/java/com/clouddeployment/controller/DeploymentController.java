package com.clouddeployment.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DeploymentController {

    @GetMapping("/")
    public String home() {
        return "Automated Cloud Deployment is Running!";
    }
}