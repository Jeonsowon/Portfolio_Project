// src/main/java/com/example/portfolioai/dto/JobReqPref.java
package com.example.portfolioai.dto;

import java.util.ArrayList;
import java.util.List;

public class JobReqPref {
    private List<String> required = new ArrayList<>();
    private List<String> preferred = new ArrayList<>();

    public JobReqPref() {}

    public JobReqPref(List<String> required, List<String> preferred) {
        if (required != null) this.required = required;
        if (preferred != null) this.preferred = preferred;
    }

    public List<String> getRequired() { return required; }
    public List<String> getPreferred() { return preferred; }

    public void setRequired(List<String> required) { this.required = required; }
    public void setPreferred(List<String> preferred) { this.preferred = preferred; }
}
