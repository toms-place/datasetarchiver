import React from 'react'

export default function App() {
    
	return (
		<div id='home'>
			<h1>Dataset Archiver</h1>
			<p>The initial vision of the World Wide Web in 1989 by Tim Berners-Lee was a system of interlinked documents, to solve the problem of locating information on distant machines. To do so, he developed the Hypertext Markup Language (HTML) which describes the structure of a document, and allows to add hyperlinks to other documents. Over the years the Web became the main tool to share and spread information, and has seen an enormous growth. However, the Web also became broader in terms of available content: while the main part of the Web consists of HTML documents, readable by humans, we can also see a trend towards publishing datasets openly available on the Web, and towards a "Web of Data". More and more datasets get published on the Web, for instance as "Open Data" -- freely available to everyone to use and re-publish without restrictions -- which is typically available on governmental data portals. Or via community portals, such as the data science platform "Kaggle" where community members can share datasets with each other.</p>

			<p>As the Web became the main tool for publishing and sharing information worldwide, there also emerged projects for storing and archiving all this published information; most important the Internet Archive and the European Web Archive: while the latter is an archive only for the EU institutions, agencies and bodies, the former is an approach to crawl and archive all content on the web. The motivation behind these archiving approaches is to provide a digital library of all documents available online, as for instance the state archive or public libraries of countries would do for all print/physical media.</p>

			<p>These digital archive solutions, however, only access websites, i.e. the HTML resources, and do not archive other resources, such as CSV tables, XML, JSON, or RDF files, or even PDF documents. The growing amount of such data freely accessible on the web and the fact that this data is changing over time aroused our interest in the metrics of web resource changes and large scale archiving solutions.</p>

			<p>Therefore we implemented a web crawler, which is capable of archiving and versioning different types of data from the web in a large scale to be able to access and analyze versioned datasets. The crawler presents metadata gathered from its datasources and provides statistics about the crawled data and the whole corpus.</p>

			<p>The main goal of this crawler is to archive any kind of data and to investigate the changes and the overall development of single resources over time. We also designed our crawler to be easily scalable and distributable over different clusters to handle the growing amount of data. In our work we also describe the implementation of the crawler and the challenges like file compression, change analysis, crawling frequencies or scalability while crawling different data types of different sizes from different resources.</p>
		</div>)
}