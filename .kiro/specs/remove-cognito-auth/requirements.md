# Requirements Document

## Introduction

Este documento especifica los requisitos para eliminar la dependencia de AWS Cognito del AWS Security Maturity Model Assessment Tool y reemplazarla con un sistema de gestión de sesiones basado en cookies que persista en el navegador. El objetivo es simplificar la arquitectura de la aplicación eliminando la necesidad de autenticación de usuario, manteniendo al mismo tiempo la funcionalidad de múltiples sesiones de evaluación que actualmente se almacenan en localStorage.

## Glossary

- **Application**: La aplicación web AWS Security Maturity Model Assessment Tool
- **Auth_Module**: El módulo actual de autenticación con Cognito (js/auth.js, js/cognito-config.js)
- **Session_Manager**: El sistema que gestiona múltiples sesiones de evaluación en localStorage (mma_sessions_v2, mma_current_session_v2)
- **Cookie_Storage**: Mecanismo de persistencia usando cookies del navegador para almacenar sesiones
- **Cognito_Files**: Los archivos relacionados con Cognito (js/auth.js, js/cognito-config.js, css/auth.css, CognitoSetup.md)
- **Script_Loader**: Las referencias `<script>` en index.html que cargan los módulos de autenticación

## Requirements

### Requirement 1: Eliminar Autenticación de Cognito

**User Story:** Como desarrollador del sistema, quiero eliminar completamente la dependencia de AWS Cognito, para que la aplicación sea más simple y no requiera configuración de servicios externos.

#### Acceptance Criteria

1. THE Application SHALL remove all Cognito authentication code from the codebase
2. THE Application SHALL remove the Auth_Module files (js/auth.js, js/cognito-config.js) from the project
3. THE Application SHALL remove the authentication stylesheet (css/auth.css) from the project
4. THE Application SHALL remove or update the Cognito documentation (CognitoSetup.md)
5. THE Script_Loader SHALL remove references to cognito-config.js and auth.js from index.html

### Requirement 2: Mantener Funcionalidad de Sesiones

**User Story:** Como usuario de la aplicación, quiero que mis sesiones de evaluación continúen funcionando sin cambios, para que mi experiencia no se vea afectada por la eliminación de Cognito.

#### Acceptance Criteria

1. THE Session_Manager SHALL continue to support multiple evaluation sessions
2. THE Session_Manager SHALL preserve all existing session data structure (id, name, date, scores, comments)
3. THE Session_Manager SHALL maintain compatibility with current localStorage keys (mma_sessions_v2, mma_current_session_v2)
4. WHEN a user creates a new session, THE Session_Manager SHALL generate a unique session identifier
5. WHEN a user switches between sessions, THE Session_Manager SHALL load the correct session data

### Requirement 3: Persistir Sesiones en Cookies

**User Story:** Como usuario de la aplicación, quiero que mis sesiones persistan en el navegador usando cookies, para que pueda cerrar y reabrir el navegador sin perder mis evaluaciones.

#### Acceptance Criteria

1. THE Cookie_Storage SHALL store session data in browser cookies
2. THE Cookie_Storage SHALL support storage of multiple sessions (array or serialized structure)
3. THE Cookie_Storage SHALL set cookie expiration to at least 365 days
4. WHEN the application loads, THE Cookie_Storage SHALL read session data from cookies
5. WHEN session data is modified, THE Cookie_Storage SHALL update the cookie storage
6. IF cookie storage exceeds browser limits, THEN THE Cookie_Storage SHALL handle the error gracefully and inform the user

### Requirement 4: Eliminar Lógica de Autenticación de Usuario

**User Story:** Como usuario de la aplicación, quiero acceder directamente a la aplicación sin necesidad de iniciar sesión, para que pueda comenzar mis evaluaciones inmediatamente.

#### Acceptance Criteria

1. THE Application SHALL load directly without authentication checks
2. THE Application SHALL not display login or logout UI elements
3. THE Application SHALL not validate user credentials or tokens
4. THE Application SHALL not redirect to authentication providers
5. THE Application SHALL remove all PKCE (Proof Key for Code Exchange) flow implementation

### Requirement 5: Limpiar Referencias de Autenticación

**User Story:** Como desarrollador del sistema, quiero eliminar todas las referencias a autenticación en el código, para que el código base sea más limpio y mantenible.

#### Acceptance Criteria

1. THE Application SHALL remove all references to the `AUTH` global variable
2. THE Application SHALL remove conditional checks for authentication state
3. THE Application SHALL remove Capacitor plugins related to authentication (@capacitor/browser, @capacitor/app)
4. THE Application SHALL update CLAUDE.md documentation to reflect the removal of authentication
5. THE Application SHALL remove authentication-related constants and configuration

### Requirement 6: Migrar de localStorage a Cookies

**User Story:** Como desarrollador del sistema, quiero implementar una función de migración de datos de localStorage a cookies, para que los usuarios existentes no pierdan sus sesiones al actualizar la aplicación.

#### Acceptance Criteria

1. WHEN the application loads for the first time after the update, THE Cookie_Storage SHALL check for existing data in localStorage
2. IF data exists in localStorage keys (mma_sessions_v2, mma_current_session_v2), THEN THE Cookie_Storage SHALL migrate the data to cookies
3. WHEN migration is complete, THE Cookie_Storage SHALL mark localStorage data as migrated
4. THE Cookie_Storage SHALL preserve all session data during migration (scores, comments, session names, dates)
5. IF migration fails, THEN THE Cookie_Storage SHALL log an error and allow the application to continue with empty state

### Requirement 7: Compatibilidad con Aplicación Existente

**User Story:** Como usuario de la aplicación, quiero que todas las funcionalidades existentes continúen funcionando después de eliminar Cognito, para que no pierda ninguna capacidad de la herramienta.

#### Acceptance Criteria

1. THE Application SHALL maintain all session management features (create, switch, delete sessions)
2. THE Application SHALL maintain all scoring functionality across all 74 assessment items
3. THE Application SHALL maintain CSV import/export functionality
4. THE Application SHALL maintain print/report generation functionality
5. THE Application SHALL maintain all UI components (sidebar, radar chart, progress bars, modals)
6. THE Application SHALL maintain filtering and search capabilities
7. THE Application SHALL continue to load assessment data from data/manifest.json

### Requirement 8: Manejo de Límites de Cookies

**User Story:** Como usuario con muchas sesiones de evaluación, quiero ser informado si alcanzo los límites de almacenamiento de cookies, para que pueda tomar acción apropiada.

#### Acceptance Criteria

1. THE Cookie_Storage SHALL monitor cookie storage size
2. IF cookie size approaches browser limits (4KB per cookie), THEN THE Cookie_Storage SHALL display a warning message
3. THE Cookie_Storage SHALL provide the option to export sessions to CSV before data loss
4. IF cookie storage fails due to size limits, THEN THE Cookie_Storage SHALL preserve the most recent session data
5. THE Application SHALL document cookie storage limitations in user documentation

### Requirement 9: Funcionalidad Sin Servidor

**User Story:** Como usuario de la aplicación, quiero que la aplicación funcione completamente en el navegador sin dependencias de servidor, para que pueda usarla en cualquier entorno.

#### Acceptance Criteria

1. THE Application SHALL function as a fully static web application
2. THE Application SHALL not make requests to authentication endpoints
3. THE Application SHALL not require AWS credentials or configuration
4. THE Application SHALL load all resources from static files or CDN
5. THE Application SHALL continue to work with local server (npx serve, python http.server)

### Requirement 10: Limpieza de Dependencias Android/Capacitor

**User Story:** Como desarrollador del sistema, quiero eliminar las dependencias de Capacitor relacionadas con autenticación, para que el proyecto no tenga código innecesario.

#### Acceptance Criteria

1. THE Application SHALL remove references to @capacitor/browser plugin
2. THE Application SHALL remove references to @capacitor/app plugin
3. THE Application SHALL remove IS_NATIVE detection logic for authentication
4. THE Application SHALL remove custom URI scheme handling (com.lep511.maturitymodel://callback)
5. IF other Capacitor functionality exists, THEN THE Application SHALL preserve non-authentication Capacitor code
