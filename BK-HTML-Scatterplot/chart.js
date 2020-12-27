const drawGraph = async () => {
  const data = await d3.json("./data.json")

  // 1) Define accesors
  const xAccessor = (d) => d.dewPoint
  const yAccessor = (d) => d.humidity

  // 2) Define dimensions
  const size = d3.min([window.innerWidth * 0.9, window.innerHeight * 0.9])
  const dimensions = {
    height: size,
    width: size,
    margin: { top: 10, right: 10, bottom: 50, left: 60 },
    boundedWidth: 0,
    boundedHeight: 0,
  }

  dimensions.boundedHeight =
    dimensions.height - dimensions.margin.top - dimensions.margin.bottom
  dimensions.boundedWidth =
    dimensions.width - dimensions.margin.left - dimensions.margin.right

  // 3) Define canvas
  const svg = d3
    .select("#wrapper")
    .append("svg")
    .attr("width", dimensions.width)
    .attr("height", dimensions.height)

  const bounds = svg
    .append("g")
    .style(
      "transform",
      `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`
    )

  // 4) Create scales
  const xScale = d3
    .scaleLinear()
    .domain(d3.extent(data, xAccessor))
    .range([0, dimensions.boundedWidth])
    .nice()

  const yScale = d3
    .scaleLinear()
    .domain(d3.extent(data, yAccessor))
    .range([dimensions.boundedHeight, 0])
    .nice()

  // 5) Draw graph
  const drawDots = (data, color, merge) => {
    const dots = bounds.selectAll("circle").data(data)

    // join = merging new with old elements
    if (merge) {
      dots
        .join("circle")
        .attr("cx", (d) => xScale(xAccessor(d)))
        .attr("cy", (d) => yScale(yAccessor(d)))
        .attr("r", 5)
        .attr("fill", color)
    } else {
      // append new elements without merging
      dots
        .enter()
        .append("circle")
        .attr("cx", (d) => xScale(xAccessor(d)))
        .attr("cy", (d) => yScale(yAccessor(d)))
        .attr("r", 5)
        .attr("fill", color)
    }

    // 7) Setup interactions
    const delaunay = d3.Delaunay.from(
      data,
      (d) => xScale(xAccessor(d)),
      (d) => yScale(yAccessor(d))
    )

    const voronoiID = "voronoi"
    const voronoi = delaunay.voronoi()
    voronoi.xmax = dimensions.boundedWidth
    voronoi.ymax = dimensions.boundedHeight

    bounds
      .selectAll(`.${voronoiID}`)
      .data(data)
      .join("path")
      .attr("class", voronoiID)
      .attr("d", (d, i) => voronoi.renderCell(i))
      .on("mouseenter", onMouseEnter)
      .on("mouseleave", onMouseLeave)

    const tooltip = d3.select("#tooltip")

    function onMouseEnter(event, d) {
      const x = xScale(xAccessor(d)) + dimensions.margin.left
      const y = yScale(yAccessor(d)) + dimensions.margin.top
      tooltip.style("opacity", 1).style(
        "transform",
        `translate(
            calc(-50% + ${x}px), 
            calc(-100% + ${y}px))`
      )

      bounds
        .append("circle")
        .attr("class", "tooltip-dot")
        .attr("cx", xScale(xAccessor(d)))
        .attr("cy", yScale(yAccessor(d)))
        .attr("r", 7)
        .style("fill", "maroon")
        .style("pointer-events", "none")

      const date = d["date"]
      const dateParser = d3.timeParse("%Y-%m-$d")
      const formatDate = d3.timeFormat("%b %A %d, %Y")
      tooltip.select("#date").text(formatDate(dateParser(date)))

      tooltip.select("#humidity").select("span").text(yAccessor(d))
      tooltip.select("#dew-point").select("span").text(xAccessor(d))
    }
    function onMouseLeave(event, d) {
      tooltip.style("opacity", 0)

      d3.selectAll(".tooltip-dot").remove()
    }
  }

  drawDots(data.slice(0, 100), "grey")
  drawDots(data, "cornflowerblue", true)

  // 6) Draw peripherals
  const xAxisGenerator = d3.axisBottom().scale(xScale)
  const yAxisGenerator = d3.axisLeft().scale(yScale).ticks(6)

  const xAxis = bounds
    .append("g")
    .call(xAxisGenerator)
    .style("transform", `translateY(${dimensions.boundedHeight}px)`)

  const yAxis = bounds.append("g").call(yAxisGenerator)

  const config = { color: "black", fontSize: "1.2rem" }
  // Axis labels
  xAxis
    .append("text")
    .attr("x", dimensions.boundedWidth / 2)
    .attr("y", dimensions.margin.bottom - 5)
    .attr("fill", config.color)
    .style("font-size", config.fontSize)
    .html("Dew point (&deg;F)")

  yAxis
    .append("text")
    .attr("x", -dimensions.height / 2)
    .attr("y", -dimensions.margin.left / 1.5)
    .attr("fill", config.color)
    .html("Relative humidity")
    .style("transform", "rotate(-90deg)")
    .style("text-anchor", "start")
    .style("font-size", config.fontSize)
}

drawGraph()
