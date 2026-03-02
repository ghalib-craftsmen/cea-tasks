# Meal Headcount Planner — Discord Bot Integration

**Version:** 1.0    
**Date:** 2026-03-02    
**Status:** Draft    

---

## 1. Overview

### 1.1 Purpose

This document defines the technical architecture, security model, and feature scope for integrating a Discord bot into the Meal Headcount Planner (MHP) system. It serves as the authoritative reference for implementation decisions during Task 2 and guides future infrastructure provisioning.

### 1.2 Project Summary

The Meal Headcount Planner (MHP) is an internal tool that helps kitchen/logistics teams accurately predict daily meal counts. Task 2 evolves the system from a standalone web tool into a production-grade platform by adding:

- A **Discord bot** as a self-service input channel for employees.
- A **serverless AWS backend** using Lambda, API Gateway, and DynamoDB.
- A **structured web dashboard** with real-time updates and component-based UI.

### 1.3 Scope of This Document

This specification covers:

- Proposed AWS serverless architecture (not yet deployed via IaC).
- Security model for Discord webhook validation and role-based authorization.
- Feature logic for Dynamic Cut-off Time and Event Meal workflows.
- Python project structure and dependency definitions.
