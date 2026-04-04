# react-bootstrap Refactor Design

**Date:** 2026-04-03  
**Status:** Approved

## Goal

Replace all raw Bootstrap class-string markup with react-bootstrap components throughout the codebase. Eliminate the only Bootstrap JS dynamic import (`import('bootstrap/dist/js/bootstrap.esm.js')` in `components/Toast.tsx`) by switching to react-bootstrap's controlled `<Toast>` component. Run `bun run format` after all edits.

## Package Changes

- Install `react-bootstrap` (v2.x, Bootstrap 5 compatible): `bun install react-bootstrap`
- Keep `bootstrap` package — react-bootstrap still requires Bootstrap's CSS
- `app/layout.tsx` keeps `import 'bootstrap/dist/css/bootstrap.min.css'`
- No Bootstrap JS is needed anywhere after this refactor

## Scope

All Bootstrap component-level markup is replaced with react-bootstrap equivalents. Bootstrap utility classes (`text-muted`, `fw-semibold`, `d-flex`, `mb-3`, `gap-2`, `p-2`, etc.) remain as `className` strings — react-bootstrap does not replace utility classes.

## Component Changes

### `components/Toast.tsx`

Full rewrite. Drop `useEffect`, `useRef`, and the dynamic `import('bootstrap/dist/js/bootstrap.esm.js')` entirely.

Use react-bootstrap's `<ToastContainer>`, `<Toast show={messages.length > 0} onClose={onDismiss} autohide={false}>`, `<Toast.Header>`, and `<Toast.Body>`. Toast visibility is controlled by React state — no imperative JS.

### `components/FolderPicker.tsx`

```
<button className="btn btn-primary btn-lg">
→ <Button variant="primary" size="lg">
```

### `components/FilterTabs.tsx`

```
<ul className="nav nav-tabs mb-3">               → <Nav variant="tabs" className="mb-3" activeKey={active} onSelect={…}>
<li className="nav-item">                         → <Nav.Item>
<button className="nav-link [active]">            → <Nav.Link eventKey={key}>
<span className="badge bg-secondary">             → <Badge bg="secondary">
```

`onSelect` type from react-bootstrap is `(key: string | null) => void`. Narrow with: `(key) => key && onChange(key as FilterType)`.

### `components/MediaGrid.tsx`

```
<div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-3">
→ <Row xs={1} sm={2} md={3} lg={4} className="g-3">

<div className="col">  →  <Col>
```

### `components/cards/VideoCard.tsx`

```
<div className="card h-100">         → <Card className="h-100">
<div className="card-body p-2">      → <Card.Body className="p-2">
<span className="badge bg-secondary me-1"> → <Badge bg="secondary" className="me-1">
```

The placeholder `<div className="card-img-top bg-secondary-subtle">` stays as a `div` with `card-img-top` class (react-bootstrap's `<Card.Img>` is for `<img>` elements only).

### `components/cards/PhotoCard.tsx`

Same card pattern as VideoCard. `<Badge bg="success" className="me-1">`.

### `components/cards/HdrCard.tsx`

```
<div className="card h-100 border-warning">   → <Card border="warning" className="h-100">
<span className="badge bg-warning text-dark"> → <Badge bg="warning" text="dark">
```

### `components/cards/PanoramaCard.tsx`

```
<div className="card-header p-2">              → <Card.Header className="p-2">
<span className="badge bg-info text-dark me-1"> → <Badge bg="info" text="dark" className="me-1">
<div className="row row-cols-4 g-1">           → <Row xs={4} className="g-1">
<div className="col">                          → <Col>
```

### `components/detail/DetailNav.tsx`

```
<nav className="navbar navbar-dark bg-dark border-bottom sticky-top">
→ <Navbar bg="dark" className="border-bottom sticky-top">

<div className="container-fluid">  → <Container fluid>

<button className="btn btn-outline-secondary btn-sm">
→ <Button variant="outline-secondary" size="sm">
```

### `components/detail/MetaTile.tsx`

```
<div className="col-6 col-md-4 col-lg-3">  → <Col xs={6} md={4} lg={3}>
```

### `components/detail/HdrDetail.tsx`

- `<span className="badge bg-warning text-dark">HDR</span>` → `<Badge bg="warning" text="dark">HDR</Badge>` (passed as `badge` prop to `DetailNav`)
- Spinner: `<span className="spinner-border spinner-border-sm">` → `<Spinner animation="border" size="sm">`
- Inline toast div → `<Toast show={hdrError} onClose={() => setHdrError(false)} className="position-fixed top-0 end-0 m-3" style={{ zIndex: 1100 }}>` with `<Toast.Header>` / `<Toast.Body>`. The existing `setTimeout` that clears `hdrError` is preserved as-is.
- `<div className="container-fluid py-4">` → `<Container fluid className="py-4">`
- `<div className="row g-2 mb-4">` → `<Row className="g-2 mb-4">`
- `<div className="col-6 col-md-4">` → `<Col xs={6} md={4}>`

### `components/detail/PhotoDetail.tsx`

- `<Badge bg="success">PHOTO</Badge>` (passed to DetailNav)
- `<Container fluid className="py-4">`, `<Row className="g-2 mb-4">` throughout

### `components/detail/VideoDetail.tsx`

- `<Badge bg="secondary">VIDEO</Badge>` (passed to DetailNav)
- `<Badge bg="secondary" className="ms-2 text-lowercase fw-normal">unavailable</Badge>`
- `<Container fluid className="py-4">`, `<Row>` throughout

### `components/detail/PanoramaDetail.tsx`

- `<Badge bg="info" text="dark">PANORAMA</Badge>` (passed to DetailNav)
- `<Container fluid className="py-4">`, `<Row className="g-2">`

### `app/page.tsx`

```
<div className="d-flex flex-column align-items-center justify-content-center vh-100">
→ <Stack className="align-items-center justify-content-center vh-100">

<div className="alert alert-info d-flex align-items-start gap-2 mb-4">
→ <Alert variant="info" className="d-flex align-items-start gap-2 mb-4">

<div className="spinner-border text-primary mb-3" role="status" />
→ <Spinner animation="border" variant="primary" className="mb-3">

<div className="alert alert-danger">  → <Alert variant="danger">

<nav className="navbar navbar-light border-bottom mb-4">
→ <Navbar className="border-bottom mb-4">

<span className="navbar-brand mb-0 h1">  → <Navbar.Brand className="mb-0 h1">

<div className="container-fluid">  → <Container fluid>
```

## Dark Mode Note

`data-bs-theme="dark"` is set on `<html>` in `layout.tsx`. Bootstrap 5's `navbar-light`/`navbar-dark` classes are obsolete — the theme attribute handles it. `<Navbar>` in `page.tsx` needs no `bg` prop. `<Navbar bg="dark">` in `DetailNav` keeps its explicit dark background.

## Formatting

Run `bun run format` after editing each file.
