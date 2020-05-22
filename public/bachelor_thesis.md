# Dataset Archiving

Scalable dataset crawling with efficient archiving and the investigation of changes between versions.

Note: Good Morning - warm welcome to my Presentation about my Archiving Project and Bachelor thesis


Information Business

---

Univ.Prof. Dr. Polleres Axel

Dipl.-Ing. Neumaier Sebastian

Note: Presentation structured like my workflow



## The Problem

<!-- .element: class="fragment" data-autoslide="500" data-fragment-index="1" -->

``` javascript
var urls = [...]

console.log(urls.lenght) // ~ 2.000.000

while (true) {

  for (let url of urls) {
    crawl(url) //async
  }

}

```
<!-- .element: class="fragment" data-fragment-index="1" -->

<!-- .element: class="fragment" data-fragment-index="2" -->

Note: Confronted with the endless loop of crawling about 2 Mio datasets.


### Motivation & Interests

<!-- .element: class="fragment" data-autoslide="500" data-fragment-index="1" -->

- Metrics of change <!-- .element: class="fragment" data-fragment-index="1" -->
- Crawling efficiency <!-- .element: class="fragment" data-fragment-index="1" -->
- Scalable systems <!-- .element: class="fragment" data-fragment-index="1" -->
- Web of open data <!-- .element: class="fragment" data-fragment-index="1" -->

<!-- .element: class="fragment" data-fragment-index="2" -->

Note: Data changes in the course of time and this metrics

efficient web crawling at large scale

open data, its quality and changerates (is it used?)


### Research Question 1

---
<!-- .element: class="fragment" data-autoslide="500" data-fragment-index="1" -->

How can a system detect changes in different versions of structured and unstructured datasets?
<!-- .element: class="fragment" data-fragment-index="1" -->

---
<!-- .element: class="fragment" data-fragment-index="1" -->

- Which methods are currently used to version files? <!-- .element: class="fragment" data-autoslide="1000" data-fragment-index="2" -->
- How do these systems detect the changes of files? <!-- .element: class="fragment" data-fragment-index="2" -->

<!-- .element: class="fragment" data-fragment-index="3" -->

Note: State of the art Versioning Systems and their functionality


### Research Question 2

---
<!-- .element: class="fragment" data-autoslide="500" data-fragment-index="1" -->

How can a system efficiently store and retrieve different versions of large datasets?
<!-- .element: class="fragment" data-fragment-index="1" -->

---
<!-- .element: class="fragment" data-fragment-index="1" -->

- How do state of the art systems like databases manage large amounts of data? <!-- .element: class="fragment" data-autoslide="1000" data-fragment-index="2" -->
- How can this be used to support the archiving of files? <!-- .element: class="fragment" data-fragment-index="2" -->

<!-- .element: class="fragment" data-fragment-index="3" -->

Note: Compression, De-duplication etc.


### Research Question 3

---
<!-- .element: class="fragment" data-autoslide="500" data-fragment-index="1" -->

How can a system manage the workload while crawling a huge amount of large datasets?
<!-- .element: class="fragment" data-fragment-index="1" -->

---
<!-- .element: class="fragment" data-fragment-index="1" -->

- Which systems do currently exist to manage the workload of large scale systems? <!-- .element: class="fragment" data-autoslide="1000" data-fragment-index="2" -->
- How can existing systems support the workload-management? <!-- .element: class="fragment" data-fragment-index="2" -->

<!-- .element: class="fragment" data-fragment-index="3" -->

Note: Distributed systems, threading, asynchronity


### Research Question 4

---
<!-- .element: class="fragment" data-autoslide="500" data-fragment-index="1" -->

Which metrics can be gathered while downloading and archiving different filetypes from different locations?
<!-- .element: class="fragment" data-fragment-index="1" -->

---
<!-- .element: class="fragment" data-fragment-index="1" -->

- Which metrics are essential for the crawling system itself? <!-- .element: class="fragment" data-autoslide="1000" data-fragment-index="2" -->
- How can this metrics be used to evaluate the functionality of the system? <!-- .element: class="fragment" data-fragment-index="2" -->

<!-- .element: class="fragment" data-fragment-index="3" -->

Note: How to gather metrics in the web of data?


### Research Method

<!-- .element: class="fragment" data-autoslide="500" data-fragment-index="1" -->

- Literature <!-- .element: class="fragment" data-fragment-index="1" -->
- Implementation <!-- .element: class="fragment" data-fragment-index="1" -->

<!-- .element: class="fragment" data-fragment-index="2" -->

Note: Like every good researcher does; Read, read, read -> work & write



## Introduction

<!-- .element: class="fragment" data-autoslide="500" data-fragment-index="1" -->

- Different data types <!-- .element: class="fragment" data-fragment-index="1" -->
- Detection of changes <!-- .element: class="fragment" data-fragment-index="1" -->
- Storage-recreation trade-off <!-- .element: class="fragment" data-fragment-index="1" -->
- Workload-management <!-- .element: class="fragment" data-fragment-index="1" -->
- Scalability <!-- .element: class="fragment" data-fragment-index="1" -->

<!-- .element: class="fragment" data-fragment-index="2" -->

Note: Types (what to store?) - Structured/Unstructured & Format

Changes (Binary?, Line-Based?); What to Store? Trade-off?

Handling 2 Mio. files and more


## Preliminaries

<!-- .element: class="fragment" data-autoslide="500" data-fragment-index="1" -->

- Git & SVN <!-- .element: class="fragment" data-fragment-index="1" -->
- MongoDB vs. PostgreSQL <!-- .element: class="fragment" data-fragment-index="1" -->
- Kubernetes & Docker <!-- .element: class="fragment" data-fragment-index="1" -->
- JavaScript vs. Python <!-- .element: class="fragment" data-fragment-index="1" -->

<!-- .element: class="fragment" data-fragment-index="2" -->

Note: Git & SVN standard versioning control systems, line based changes

Standard: MongoDB NoSQL-DB w\ dynamic Schema, ability to store files | PostgreSQL Relational Schema

Python blocking/synchronous & threaded | JavaScript non-blocking/asynchronous & not threaded, Node.js JS runtime built on Chrome's V8 JavaScript engine.


## Primary Requirements
<!-- .slide: data-transition="fade-out" -->

<!-- .element: class="fragment" data-autoslide="500" data-fragment-index="1" -->

- Scalability <!-- .element: class="fragment" data-fragment-index="1" -->
- Host politeness <!-- .element: class="fragment" data-fragment-index="1" -->
- Profiling/Statistics <!-- .element: class="fragment" data-fragment-index="1" -->
- REST API <!-- .element: class="fragment" data-fragment-index="1" -->

<!-- .element: class="fragment" data-fragment-index="2" -->

Note: push of button more resources & one file at a time


## Secondary Requirements
<!-- .slide: data-transition="fade-in" -->

<!-- .element: class="fragment" data-autoslide="500" data-fragment-index="1" -->

- Arbitrary URLs <!-- .element: class="fragment" data-fragment-index="1" -->
- Data quality metrics <!-- .element: class="fragment" data-fragment-index="1" -->
- Enhanced host politeness <!-- .element: class="fragment" data-fragment-index="1" -->
- Web interface <!-- .element: class="fragment" data-fragment-index="1" -->

<!-- .element: class="fragment" data-fragment-index="2" -->

Note: Fetch URLs of Websites themselfs (web-spider)

Metrics & statistics about data itself

robots.txt



## Implementation
<!-- .slide: data-transition="fade-in fade-out" -->


![External Image](public/img/system_architecture.svg)
<!-- .slide: data-transition="fade-in fade-out" -->

Note: Kubernetes (MongoDB upcoming - BigData Storage)


![External Image](public/img/database_model.svg)
<!-- .slide: data-transition="fade-in fade-out" -->

Note: m..n better relational


![External Image](public/img/sequence_diagram.svg)
<!-- .slide: data-transition="fade-in fade-out" -->

Note: Crawling itself - http headers and piping to db (lack if shutdown)


## Future Work

<!-- .element: class="fragment" data-autoslide="500" data-fragment-index="1" -->

- Sockets <!-- .element: class="fragment" data-fragment-index="1" -->
- Enhanced k8s cluster <!-- .element: class="fragment" data-fragment-index="1" -->
- Self managed scaling<!-- .element: class="fragment" data-fragment-index="1" -->
- Relational meta storage <!-- .element: class="fragment" data-fragment-index="1" -->
- Redis locking storage <!-- .element: class="fragment" data-fragment-index="1" -->
- Web Interface <!-- .element: class="fragment" data-fragment-index="1" -->

<!-- .element: class="fragment" data-fragment-index="2" -->

Note: less requests (http overhead)

rancher interface - more nodes -> more resources

based on load - manage pod count

see Schema

locking is heavy in MongoDB

Independent of API



## Services

<!-- .element: class="fragment" data-autoslide="500" data-fragment-index="1" -->

- /get <!-- .element: class="fragment" data-fragment-index="1" -->
- /stats <!-- .element: class="fragment" data-fragment-index="1" -->
- /post <!-- .element: class="fragment" data-fragment-index="1" -->
- /crawl <!-- .element: class="fragment" data-fragment-index="1" -->

<!-- .element: class="fragment" data-fragment-index="2" -->
